// PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1
//
// Validates the pure Requirements Request Letter schema scaffold and its
// fixture. NO live HTTP, NO OpenAI / Supabase / Google Drive / n8n /
// Firecrawl / Crawlee, NO env vars, NO server import, NO server start, NO
// port binding.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PHASE_09I_REQUIREMENTS_REQUEST_LETTER_SCHEMA_VERSION,
  REQUIREMENTS_REQUEST_LETTER_SCHEMA,
  REQUIREMENTS_REQUEST_LETTER_REQUIRED_TOP_LEVEL_FIELDS,
  REQUIREMENTS_REQUEST_LETTER_REQUIRED_INPUTS,
  REQUIREMENTS_REQUEST_LETTER_REQUIRED_OUTPUT_SECTIONS,
  REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES,
  REQUIREMENTS_REQUEST_LETTER_PROHIBITED_BEHAVIORS,
  REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES,
  REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS,
  REQUIREMENTS_REQUEST_LETTER_TONE_VALUES,
  createEmptyRequirementsRequestLetterOutput,
  createEmptyRequirementsRequestItem,
  getRequirementsRequestLetterSchema,
  getRequirementsRequestLetterRequiredInputs,
  getRequirementsRequestLetterRequiredOutputSections,
  getRequirementsRequestLetterGovernanceRules,
  getRequirementsRequestLetterAudienceTypes,
  getRequirementsRequestLetterRequestContexts,
  getRequirementsRequestLetterToneValues,
  getRequirementsRequestLetterSourceCardRequirement,
  validateRequirementsRequestLetterOutputShape,
  validateRequirementsRequestItemShape,
  validateRequirementsRequestLetterSchema,
  normalizeRequirementsRequestTopics,
  normalizeRequirementsRequestAudienceType,
  normalizeRequirementsRequestContext,
  normalizeRequirementsRequestTone
} from "../workflow/requirements-request-letter-schema.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09i-requirements-request-letter-schema-scaffold-1.fixture.json";
const SCHEMA_PATH = "workflow/requirements-request-letter-schema.js";
const SELF_PATH = "tests/phase-09i-requirements-request-letter-schema-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09I REQUIREMENTS REQUEST LETTER SCHEMA SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09I REQUIREMENTS REQUEST LETTER SCHEMA SCAFFOLD WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09I REQUIREMENTS REQUEST LETTER SCHEMA SCAFFOLD FAIL",
  "PHASE 09I REQUIREMENTS REQUEST LETTER SCHEMA SCAFFOLD BLOCKED"
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
await test("patch id matches PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1", () => {
  check(fx.patch.id === "PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1", "patch id");
});

// 4
await test("decision is valid; PASS if all required scaffold elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 5
await test("base commit is 6418f82", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("6418f82"), "base commit 6418f82");
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
await test("fixture says Phase 9H runtime policy not modified", () => {
  check(fx.nonRuntimePatch.phase9HRuntimePolicyNotModified === true, "Phase 9H runtime policy not modified");
  check(fx.runtimeBoundary.doesNotChangePhase9HRuntimePolicy === true, "runtime boundary confirms Phase 9H unchanged");
});

// 12
await test("schema exports expected helpers", () => {
  check(typeof PHASE_09I_REQUIREMENTS_REQUEST_LETTER_SCHEMA_VERSION === "string", "version export");
  check(typeof REQUIREMENTS_REQUEST_LETTER_SCHEMA === "object", "SCHEMA export");
  check(Array.isArray(REQUIREMENTS_REQUEST_LETTER_REQUIRED_TOP_LEVEL_FIELDS), "REQUIRED_TOP_LEVEL_FIELDS export");
  check(Array.isArray(REQUIREMENTS_REQUEST_LETTER_REQUIRED_INPUTS), "REQUIRED_INPUTS export");
  check(Array.isArray(REQUIREMENTS_REQUEST_LETTER_REQUIRED_OUTPUT_SECTIONS), "REQUIRED_OUTPUT_SECTIONS export");
  check(Array.isArray(REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES), "GOVERNANCE_RULES export");
  check(Array.isArray(REQUIREMENTS_REQUEST_LETTER_PROHIBITED_BEHAVIORS), "PROHIBITED_BEHAVIORS export");
  check(Array.isArray(REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES), "AUDIENCE_TYPES export");
  check(Array.isArray(REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS), "REQUEST_CONTEXTS export");
  check(Array.isArray(REQUIREMENTS_REQUEST_LETTER_TONE_VALUES), "TONE_VALUES export");
  check(typeof createEmptyRequirementsRequestLetterOutput === "function", "createEmptyRequirementsRequestLetterOutput export");
  check(typeof createEmptyRequirementsRequestItem === "function", "createEmptyRequirementsRequestItem export");
  check(typeof getRequirementsRequestLetterSchema === "function", "getRequirementsRequestLetterSchema export");
  check(typeof getRequirementsRequestLetterRequiredInputs === "function", "getRequirementsRequestLetterRequiredInputs export");
  check(typeof getRequirementsRequestLetterRequiredOutputSections === "function", "getRequirementsRequestLetterRequiredOutputSections export");
  check(typeof getRequirementsRequestLetterGovernanceRules === "function", "getRequirementsRequestLetterGovernanceRules export");
  check(typeof getRequirementsRequestLetterAudienceTypes === "function", "getRequirementsRequestLetterAudienceTypes export");
  check(typeof getRequirementsRequestLetterRequestContexts === "function", "getRequirementsRequestLetterRequestContexts export");
  check(typeof getRequirementsRequestLetterToneValues === "function", "getRequirementsRequestLetterToneValues export");
  check(typeof getRequirementsRequestLetterSourceCardRequirement === "function", "getRequirementsRequestLetterSourceCardRequirement export");
  check(typeof validateRequirementsRequestLetterOutputShape === "function", "validateRequirementsRequestLetterOutputShape export");
  check(typeof validateRequirementsRequestItemShape === "function", "validateRequirementsRequestItemShape export");
  check(typeof validateRequirementsRequestLetterSchema === "function", "validateRequirementsRequestLetterSchema export");
  check(typeof normalizeRequirementsRequestTopics === "function", "normalizeRequirementsRequestTopics export");
  check(typeof normalizeRequirementsRequestAudienceType === "function", "normalizeRequirementsRequestAudienceType export");
  check(typeof normalizeRequirementsRequestContext === "function", "normalizeRequirementsRequestContext export");
  check(typeof normalizeRequirementsRequestTone === "function", "normalizeRequirementsRequestTone export");
});

// 13
await test("PHASE_09I_REQUIREMENTS_REQUEST_LETTER_SCHEMA_VERSION exists", () => {
  check(PHASE_09I_REQUIREMENTS_REQUEST_LETTER_SCHEMA_VERSION.length > 0, "version non-empty");
});

// 14-23
await test("REQUIREMENTS_REQUEST_LETTER_SCHEMA identity fields are correct", () => {
  check(REQUIREMENTS_REQUEST_LETTER_SCHEMA.mode === "requirements_request_letter", "mode requirements_request_letter");
  check(REQUIREMENTS_REQUEST_LETTER_SCHEMA.schemaKey === "requirementsRequestLetterOutput", "schemaKey requirementsRequestLetterOutput");
  check(REQUIREMENTS_REQUEST_LETTER_SCHEMA.runtimeWiring === false, "runtimeWiring false");
  check(REQUIREMENTS_REQUEST_LETTER_SCHEMA.featureFlagDefault === "off", "featureFlagDefault off");
  check(REQUIREMENTS_REQUEST_LETTER_SCHEMA.humanReviewRequired === true, "humanReviewRequired true");
  check(REQUIREMENTS_REQUEST_LETTER_SCHEMA.sourceCardsRequired === true, "sourceCardsRequired true");
  check(REQUIREMENTS_REQUEST_LETTER_SCHEMA.missingFactsRequired === true, "missingFactsRequired true");
  check(REQUIREMENTS_REQUEST_LETTER_SCHEMA.assumptionsRequired === true, "assumptionsRequired true");
  check(REQUIREMENTS_REQUEST_LETTER_SCHEMA.finalFiling === false, "finalFiling false");
  check(REQUIREMENTS_REQUEST_LETTER_SCHEMA.automaticSubmission === false, "automaticSubmission false");
});

// 24
await test("required inputs include requestContext, recipientType, purpose, facts, requestedDocumentsOrInformation, intendedUse", () => {
  for (const input of ["requestContext", "recipientType", "purpose", "facts", "requestedDocumentsOrInformation", "intendedUse"]) {
    check(REQUIREMENTS_REQUEST_LETTER_REQUIRED_INPUTS.includes(input), `required inputs include ${input}`);
  }
});

// 25
await test("required output sections match the stable canonical list", () => {
  const expected = [
    "subject", "salutation", "openingContext", "purposeOfRequest", "requirementsRequested",
    "deadlineOrTiming", "submissionInstructions", "closingStatement", "assumptions",
    "missingFacts", "sourceCards", "humanReviewNotice"
  ];
  check(REQUIREMENTS_REQUEST_LETTER_REQUIRED_OUTPUT_SECTIONS.join(",") === expected.join(","), "canonical output sections match");
});

// 26
await test("required top-level fields include all mandated fields", () => {
  const expected = [
    "mode", "schemaKey", "subject", "salutation", "openingContext", "purposeOfRequest",
    "requirementsRequested", "deadlineOrTiming", "submissionInstructions", "closingStatement",
    "assumptions", "missingFacts", "sourceCards", "humanReviewNotice", "metadata"
  ];
  for (const field of expected) check(REQUIREMENTS_REQUEST_LETTER_REQUIRED_TOP_LEVEL_FIELDS.includes(field), `top-level fields include ${field}`);
});

// 27
await test("audience types include all mandated types", () => {
  for (const t of ["client", "management", "board", "owner", "accountant", "employee", "vendor", "counterparty", "government_office", "legal", "auditor", "internal_team", "unknown"]) {
    check(REQUIREMENTS_REQUEST_LETTER_AUDIENCE_TYPES.includes(t), `audience types include ${t}`);
  }
});

// 28
await test("request contexts include all mandated contexts", () => {
  for (const c of [
    "tax_compliance", "tax_audit", "bir_assessment", "accounting", "audit", "business_registration",
    "business_closure", "sec_compliance", "lgu_permit", "payroll", "bookkeeping",
    "engagement_requirements", "due_diligence", "unknown"
  ]) {
    check(REQUIREMENTS_REQUEST_LETTER_REQUEST_CONTEXTS.includes(c), `request contexts include ${c}`);
  }
});

// 29
await test("tone values include professional, formal, concise, firm, polite, urgent, neutral, unknown", () => {
  for (const t of ["professional", "formal", "concise", "firm", "polite", "urgent", "neutral", "unknown"]) {
    check(REQUIREMENTS_REQUEST_LETTER_TONE_VALUES.includes(t), `tone values include ${t}`);
  }
});

// 30-42
await test("governance rules include all mandated rules", () => {
  const expected = [
    "existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion", "no_fabricated_citations",
    "source_cards_required", "missing_facts_required", "human_review_required",
    "request_must_be_tied_to_facts_or_authority", "recipient_type_must_be_labeled",
    "request_context_must_be_labeled", "draft_only_not_final_correspondence",
    "no_memory_activation", "no_third_party_egress"
  ];
  for (const rule of expected) check(REQUIREMENTS_REQUEST_LETTER_GOVERNANCE_RULES.includes(rule), `governance rules include ${rule}`);
});

// 43-53
await test("prohibited behaviors include all mandated behaviors", () => {
  const expected = [
    "fabricated_authority", "final_filing_claim", "live_web_search", "memory_write", "production_change",
    "deadline_claim_without_date_basis", "false_timeliness_assurance", "final_correspondence_claim",
    "sending_claim_without_user_approval", "recipient_type_unlabeled", "request_context_unlabeled"
  ];
  for (const behavior of expected) check(REQUIREMENTS_REQUEST_LETTER_PROHIBITED_BEHAVIORS.includes(behavior), `prohibited behaviors include ${behavior}`);
});

// 54 + 55
await test("getRequirementsRequestLetterSchema returns defensive copy; mutation does not affect internal schema", () => {
  const schema = getRequirementsRequestLetterSchema();
  check(schema.mode === "requirements_request_letter", "schema mode requirements_request_letter");
  schema.mode = "MUTATED";
  schema.requiredInputs.push("INJECTED");
  const again = getRequirementsRequestLetterSchema();
  check(again.mode === "requirements_request_letter", "mode unaffected by prior mutation");
  check(!again.requiredInputs.includes("INJECTED"), "requiredInputs unaffected by prior mutation");
});

// 56 + 57
await test("createEmptyRequirementsRequestLetterOutput returns fresh objects; mutating one does not affect another", () => {
  const a = createEmptyRequirementsRequestLetterOutput();
  const b = createEmptyRequirementsRequestLetterOutput();
  a.sourceCards.push({ sourceCardId: "x" });
  a.metadata.finalFiling = true;
  a.metadata.requestContext = "tax_compliance";
  a.requirementsRequested.push(createEmptyRequirementsRequestItem());
  check(b.sourceCards.length === 0, "second instance sourceCards unaffected");
  check(b.metadata.finalFiling === false, "second instance metadata unaffected");
  check(b.metadata.requestContext === "unknown", "second instance requestContext unaffected");
  check(b.requirementsRequested.length === 0, "second instance requirementsRequested unaffected");
});

// 58
await test("createEmptyRequirementsRequestLetterOutput includes all required top-level fields", () => {
  const output = createEmptyRequirementsRequestLetterOutput();
  for (const field of REQUIREMENTS_REQUEST_LETTER_REQUIRED_TOP_LEVEL_FIELDS) {
    check(Object.prototype.hasOwnProperty.call(output, field), `empty output has field ${field}`);
  }
});

// 59
await test("createEmptyRequirementsRequestLetterOutput metadata defaults are correct", () => {
  const output = createEmptyRequirementsRequestLetterOutput();
  check(output.metadata.finalFiling === false, "metadata.finalFiling false");
  check(output.metadata.automaticSubmission === false, "metadata.automaticSubmission false");
  check(output.metadata.runtimeWiring === false, "metadata.runtimeWiring false");
  check(output.metadata.featureFlagDefault === "off", "metadata.featureFlagDefault off");
});

// 60
await test("createEmptyRequirementsRequestLetterOutput metadata requestContext defaults to unknown", () => {
  check(createEmptyRequirementsRequestLetterOutput().metadata.requestContext === "unknown", "requestContext defaults to unknown");
});

// 61
await test("createEmptyRequirementsRequestLetterOutput metadata recipientType defaults to unknown", () => {
  check(createEmptyRequirementsRequestLetterOutput().metadata.recipientType === "unknown", "recipientType defaults to unknown");
});

// 62
await test("createEmptyRequirementsRequestLetterOutput metadata tone defaults to professional", () => {
  check(createEmptyRequirementsRequestLetterOutput().metadata.tone === "professional", "tone defaults to professional");
});

// 63 + 64
await test("createEmptyRequirementsRequestItem returns fresh objects; mutating one does not affect another", () => {
  const a = createEmptyRequirementsRequestItem();
  const b = createEmptyRequirementsRequestItem();
  a.sourceCards.push({ sourceCardId: "x" });
  a.requirement = "2023 audited financial statements";
  check(b.sourceCards.length === 0, "second item sourceCards unaffected");
  check(b.requirement === "", "second item requirement unaffected");
});

// 65
await test("createEmptyRequirementsRequestItem includes all item fields", () => {
  const item = createEmptyRequirementsRequestItem();
  for (const field of ["requirement", "purpose", "priority", "responsibleParty", "deadlineOrTiming", "formatOrTemplate", "authorityOrBasis", "notes", "assumptions", "missingFacts", "sourceCards"]) {
    check(Object.prototype.hasOwnProperty.call(item, field), `empty item has field ${field}`);
  }
});

// 66
await test("validateRequirementsRequestLetterOutputShape: valid true for empty scaffold, with warnings", () => {
  const output = createEmptyRequirementsRequestLetterOutput();
  const result = validateRequirementsRequestLetterOutputShape(output);
  check(result.valid === true, `empty scaffold should be shape-valid: ${JSON.stringify(result.errors)}`);
  check(result.warnings.some((w) => /^subject is empty/i.test(w)), "warns on empty subject");
  check(result.warnings.some((w) => /openingContext/i.test(w)), "warns on empty openingContext");
  check(result.warnings.some((w) => /purposeOfRequest/i.test(w)), "warns on empty purposeOfRequest");
  check(result.warnings.some((w) => /requirementsRequested/i.test(w)), "warns on empty requirementsRequested");
  check(result.warnings.some((w) => /sourceCards/i.test(w)), "warns on empty sourceCards");
  check(result.warnings.some((w) => /missingFacts/i.test(w)), "warns on empty missingFacts");
  check(result.warnings.some((w) => /assumptions/i.test(w)), "warns on empty assumptions");
  check(result.warnings.some((w) => /humanReviewNotice/i.test(w)), "warns on empty humanReviewNotice");
  check(result.warnings.some((w) => /requestContext is unknown/i.test(w)), "warns on unknown requestContext");
  check(result.warnings.some((w) => /recipientType is unknown/i.test(w)), "warns on unknown recipientType");
});

// 67
await test("validateRequirementsRequestItemShape: valid true for empty scaffold item, with warnings", () => {
  const item = createEmptyRequirementsRequestItem();
  const result = validateRequirementsRequestItemShape(item);
  check(result.valid === true, `empty item should be shape-valid: ${JSON.stringify(result.errors)}`);
  check(result.warnings.some((w) => /^requirement is empty/i.test(w)), "warns on empty requirement");
  check(result.warnings.some((w) => /^purpose is empty/i.test(w)), "warns on empty purpose");
  check(result.warnings.some((w) => /authorityOrBasis/i.test(w)), "warns on empty authorityOrBasis");
  check(result.warnings.some((w) => /sourceCards/i.test(w)), "warns on empty sourceCards");
  check(result.warnings.some((w) => /missingFacts/i.test(w)), "warns on empty missingFacts");
  check(result.warnings.some((w) => /assumptions/i.test(w)), "warns on empty assumptions");
});

// 68
await test("validateRequirementsRequestLetterOutputShape: valid false for malformed input", () => {
  const result = validateRequirementsRequestLetterOutputShape({ mode: "wrong_mode" });
  check(result.valid === false, "malformed output invalid");
  check(result.errors.length > 0, "errors recorded for malformed output");
});

// 69
await test("validateRequirementsRequestItemShape: valid false for malformed input", () => {
  const result = validateRequirementsRequestItemShape({ requirement: 42 });
  check(result.valid === false, "malformed item invalid");
  check(result.errors.length > 0, "errors recorded for malformed item");
});

// 70
await test("both validators do not throw on null/undefined/string/array", () => {
  for (const bad of [null, undefined, "a string", [1, 2, 3], 42, true]) {
    const outResult = validateRequirementsRequestLetterOutputShape(bad);
    const itemResult = validateRequirementsRequestItemShape(bad);
    check(outResult.valid === false, `output validator: non-object input ${JSON.stringify(bad)} is invalid`);
    check(itemResult.valid === false, `item validator: non-object input ${JSON.stringify(bad)} is invalid`);
  }
});

// 71
await test("validateRequirementsRequestLetterSchema returns valid true", () => {
  const result = validateRequirementsRequestLetterSchema();
  check(result.valid === true, `schema should validate: ${JSON.stringify(result.errors)}`);
});

// 72
await test("validateRequirementsRequestLetterSchema returns required counts", () => {
  const result = validateRequirementsRequestLetterSchema();
  check(typeof result.requiredFieldCount === "number" && result.requiredFieldCount > 0, "requiredFieldCount present");
  check(typeof result.requiredInputCount === "number" && result.requiredInputCount > 0, "requiredInputCount present");
  check(typeof result.requiredOutputSectionCount === "number" && result.requiredOutputSectionCount > 0, "requiredOutputSectionCount present");
  check(typeof result.governanceRuleCount === "number" && result.governanceRuleCount > 0, "governanceRuleCount present");
  check(typeof result.prohibitedBehaviorCount === "number" && result.prohibitedBehaviorCount > 0, "prohibitedBehaviorCount present");
  check(typeof result.audienceTypeCount === "number" && result.audienceTypeCount === 13, "audienceTypeCount 13");
  check(typeof result.requestContextCount === "number" && result.requestContextCount === 15, "requestContextCount 15");
  check(typeof result.toneValueCount === "number" && result.toneValueCount === 8, "toneValueCount 8");
});

// 73
await test("normalizeRequirementsRequestTopics handles arrays, strings, blanks, null, unsupported input", () => {
  check(JSON.stringify(normalizeRequirementsRequestTopics(["a", " b ", "", "  ", "c"])) === JSON.stringify(["a", "b", "c"]), "array trims and filters blanks");
  check(JSON.stringify(normalizeRequirementsRequestTopics("single topic")) === JSON.stringify(["single topic"]), "string becomes one-item array");
  check(JSON.stringify(normalizeRequirementsRequestTopics("   ")) === JSON.stringify([]), "blank string becomes empty array");
  check(JSON.stringify(normalizeRequirementsRequestTopics(null)) === JSON.stringify([]), "null becomes empty array");
  check(JSON.stringify(normalizeRequirementsRequestTopics(undefined)) === JSON.stringify([]), "undefined becomes empty array");
  check(JSON.stringify(normalizeRequirementsRequestTopics(42)) === JSON.stringify([]), "number becomes empty array");
  check(JSON.stringify(normalizeRequirementsRequestTopics({ a: 1 })) === JSON.stringify([]), "object becomes empty array");
});

// 74
await test("normalizeRequirementsRequestAudienceType maps aliases to canonical values", () => {
  const cases = [
    ["client", "client"], ["management", "management"], ["manager", "management"],
    ["board", "board"], ["BOD", "board"], ["directors", "board"],
    ["owner", "owner"], ["shareholder", "owner"], ["stockholder", "owner"],
    ["accountant", "accountant"], ["accounting", "accountant"],
    ["employee", "employee"], ["staff", "employee"],
    ["vendor", "vendor"], ["supplier", "vendor"],
    ["counterparty", "counterparty"], ["third party", "counterparty"],
    ["government", "government_office"], ["BIR", "government_office"], ["SEC", "government_office"], ["LGU", "government_office"],
    ["legal", "legal"], ["lawyer", "legal"], ["counsel", "legal"],
    ["auditor", "auditor"], ["external auditor", "auditor"],
    ["internal", "internal_team"], ["team", "internal_team"],
    ["", "unknown"], [null, "unknown"], [undefined, "unknown"], ["totally unsupported", "unknown"], [42, "unknown"]
  ];
  for (const [input, expected] of cases) check(normalizeRequirementsRequestAudienceType(input) === expected, `${JSON.stringify(input)} -> ${expected}`);
});

// 75
await test("normalizeRequirementsRequestContext maps aliases to canonical values", () => {
  const cases = [
    ["tax", "tax_compliance"], ["tax compliance", "tax_compliance"], ["tax audit", "tax_audit"],
    ["BIR assessment", "bir_assessment"], ["assessment", "bir_assessment"],
    ["accounting", "accounting"], ["audit", "audit"], ["external audit", "audit"],
    ["business registration", "business_registration"], ["registration", "business_registration"],
    ["business closure", "business_closure"], ["closure", "business_closure"],
    ["SEC", "sec_compliance"], ["SEC compliance", "sec_compliance"],
    ["LGU", "lgu_permit"], ["business permit", "lgu_permit"], ["mayor's permit", "lgu_permit"],
    ["payroll", "payroll"], ["bookkeeping", "bookkeeping"],
    ["engagement", "engagement_requirements"], ["due diligence", "due_diligence"],
    ["", "unknown"], [null, "unknown"], [undefined, "unknown"], ["totally unsupported", "unknown"], [42, "unknown"]
  ];
  for (const [input, expected] of cases) check(normalizeRequirementsRequestContext(input) === expected, `${JSON.stringify(input)} -> ${expected}`);
});

// 76
await test("normalizeRequirementsRequestTone maps aliases to canonical values", () => {
  const cases = [
    ["professional", "professional"], ["formal", "formal"],
    ["short", "concise"], ["brief", "concise"], ["concise", "concise"],
    ["firm", "firm"], ["strict", "firm"],
    ["polite", "polite"], ["courteous", "polite"],
    ["urgent", "urgent"], ["rush", "urgent"],
    ["neutral", "neutral"],
    ["", "unknown"], [null, "unknown"], [undefined, "unknown"], ["totally unsupported", "unknown"], [42, "unknown"]
  ];
  for (const [input, expected] of cases) check(normalizeRequirementsRequestTone(input) === expected, `${JSON.stringify(input)} -> ${expected}`);
});

// 77
await test("getRequirementsRequestLetterSourceCardRequirement returns required true", () => {
  check(getRequirementsRequestLetterSourceCardRequirement().required === true, "required true");
});

// 78
await test("getRequirementsRequestLetterSourceCardRequirement currentPhase9Policy gdrive_archive_acceptable", () => {
  check(getRequirementsRequestLetterSourceCardRequirement().currentPhase9Policy === "gdrive_archive_acceptable", "currentPhase9Policy correct");
});

// 79
await test("getRequirementsRequestLetterSourceCardRequirement officialUrlRequiredInPhase9 false", () => {
  check(getRequirementsRequestLetterSourceCardRequirement().officialUrlRequiredInPhase9 === false, "officialUrlRequiredInPhase9 false");
});

// 80
await test("getRequirementsRequestLetterSourceCardRequirement canonicalSourceIdRequiredInPhase9 false", () => {
  check(getRequirementsRequestLetterSourceCardRequirement().canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceIdRequiredInPhase9 false");
});

// 81
await test("fixture source-card boundary matches Phase 9/Phase 10 policy", () => {
  const b = fx.sourceCardBoundary;
  check(b.currentPhase9GdriveArchiveAcceptable === true, "current Phase 9 GDrive/archive acceptable");
  check(b.officialUrlRequiredInPhase9 === false, "officialUrl not required in Phase 9");
  check(b.canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceId not required in Phase 9");
  check(b.futurePhase10OfficialUrlPrimaryArchiveUrlSecondaryCanonicalSourceIdInternal === true, "future Phase 10 policy recorded");
  check(b.noPhase10ImplementationInThisPatch === true, "no Phase 10 implementation in this patch");
});

// 82
await test("fixture runtime boundary says schema only and no runtime wiring", () => {
  check(fx.runtimeBoundary.schemaOnly === true, "runtime boundary schema only");
  check(fx.runtimeBoundary.noRuntimeWiring === true, "runtime boundary no runtime wiring");
});

// 83
await test("fixture governanceGateNote says Phase 9G not modified", () => {
  check(fx.governanceGateNote.thisPatchAddsDedicatedSchemaButDoesNotModifyPhase9GGate === true, "governance gate note confirms Phase 9G unchanged");
});

// 84
await test("fixture runtimePolicyNote says Phase 9H policy not modified", () => {
  check(fx.runtimePolicyNote.thisPatchAddsSchemaOnlyAndDoesNotModifyPhase9HPolicy === true, "runtime policy note confirms Phase 9H unchanged");
});

// 85
await test("fixture future patch plan includes PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1", () => {
  check(hasAll(fx.futurePatchPlan, ["PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1"]), "future patch plan includes PHASE-09R");
});

// 86
await test("fixture optional later recommendations may include PHASE-09J and PHASE-09K", () => {
  check(hasAll(fx.optionalLaterRecommendationList, ["PHASE-09J-WORKFLOW-GOVERNANCE-COVERAGE-REFRESH-1", "PHASE-09K-WORKFLOW-RUNTIME-POLICY-COVERAGE-REFRESH-1"]), "optional later recommendations present");
});

// 87
await test("fixture prohibited claims include required non-claims", () => {
  check(hasAll(fx.prohibitedClaims, [
    "live requirements request letter generation implemented",
    "requirements request letter runtime enabled",
    "production ready",
    "memory enabled",
    "external search implemented",
    "n8n implemented",
    "Firecrawl implemented",
    "Crawlee implemented",
    "Phase 10 source governance implemented",
    "Phase 11 retrieval optimization implemented",
    "automatic sending implemented",
    "automatic filing implemented"
  ]), "required prohibited claims present");
});

// 88
await test("next task is PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1", "next task PHASE-09R");
});

// 89
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

// 90
await test("static source scan: requirements-request-letter-schema.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(SCHEMA_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length === 0, `schema must have zero imports (found: ${JSON.stringify(importTargets)})`);
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

console.log(`\nPHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
