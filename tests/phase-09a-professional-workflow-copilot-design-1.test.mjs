// PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1
//
// Design-only validation. NO live HTTP, NO OpenAI / Supabase / Google Drive /
// n8n / Firecrawl / Crawlee, NO env vars, NO server import, NO server start, NO
// port binding. It validates the recorded design fixture and the presence of the
// design document only.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = "evaluation/fixtures/phase-09a-professional-workflow-copilot-design-1.fixture.json";
const DESIGN_DOC_PATH = "docs/phase-09/PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN.md";
const SELF_PATH = "tests/phase-09a-professional-workflow-copilot-design-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09A PROFESSIONAL WORKFLOW COPILOT DESIGN PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09A PROFESSIONAL WORKFLOW COPILOT DESIGN WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09A PROFESSIONAL WORKFLOW COPILOT DESIGN FAIL",
  "PHASE 09A PROFESSIONAL WORKFLOW COPILOT DESIGN BLOCKED"
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
const isPass = () => fx.decision === VALID_DECISIONS[0];
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
await test("design doc exists", () => {
  check(existsSync(resolve(DESIGN_DOC_PATH)), `${DESIGN_DOC_PATH} must exist`);
});

// 3
await test("patch id matches PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1", () => {
  check(fx.patch.id === "PHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1", "patch id");
});

// 4
await test("decision is valid; PASS when all required design elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 5
await test("phase is 09A", () => {
  check(fx.phase === "09A", "phase 09A");
  check(fx.patch.phase === "09A", "patch.phase 09A");
});

// 6
await test("base commit is 5a6f2f9", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("5a6f2f9"), "base commit 5a6f2f9");
});

// 7
await test("non-runtime patch true", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.designOnly === true, "designOnly true");
  check(n.noRuntimeFilesChanged === true, "noRuntimeFilesChanged true");
  check(n.noDeployment === true && n.noProductionChanges === true, "no deployment / no production changes");
});

// 8
await test("current state: Phase 8 closed, 8S closed, 08X closed, Phase 9 design begins, memory inactive, production unchanged", () => {
  const c = fx.currentState;
  check(c.phase8Closed === true, "Phase 8 closed");
  check(c.phase8SClosed === true, "Phase 8S closed");
  check(c.phase08XClosed === true, "08X closed");
  check(c.phase9DesignBegins === true, "Phase 9 design begins");
  check(c.memoryInactive === true, "memory inactive");
  check(c.productionUnchanged === true, "production unchanged");
});

// 9
await test("included modes include all six professional modes", () => {
  check(hasAll(fx.includedModes, [
    "tax memo",
    "BIR reply/protest draft",
    "audit defense matrix",
    "client advisory",
    "compliance checklist",
    "requirements request letter"
  ]), "all six modes present");
});

// 10
await test("excluded scope includes required exclusions", () => {
  check(hasAll(fx.excludedScope, [
    "live web search",
    "n8n",
    "Firecrawl",
    "Crawlee",
    "authority source intake",
    "BM25",
    "reranking",
    "query cache",
    "memory activation",
    "client/matter persistence",
    "production deployment"
  ]), "all required exclusions present");
});

// 11
await test("retrieval contract says existing retrieval only", () => {
  check(fx.retrievalContract.existingRetrievalOnly === true, "existing retrieval only");
});

// 12
await test("retrieval contract says no live web search", () => {
  check(fx.retrievalContract.noLiveWebSearch === true, "no live web search");
});

// 13
await test("retrieval contract says no new authority ingestion", () => {
  check(fx.retrievalContract.noNewAuthorityIngestion === true, "no new authority ingestion");
});

// 14
await test("authority discipline includes no fabricated citations", () => {
  check(fx.authorityDiscipline.noFabricatedCitations === true, "no fabricated citations");
});

// 15
await test("source card policy says current GDrive/archive acceptable", () => {
  check(fx.sourceCardPolicy.currentPhase9.gdriveArchiveAcceptable === true, "current GDrive/archive acceptable");
});

// 16
await test("source card policy says future Phase 10 officialUrl primary, archiveUrl secondary, canonicalSourceId internal source of truth", () => {
  const f = fx.sourceCardPolicy.futurePhase10;
  check(f.officialUrlPrimary === true, "officialUrl primary");
  check(f.archiveUrlSecondary === true, "archiveUrl secondary");
  check(f.canonicalSourceIdInternalSourceOfTruth === true, "canonicalSourceId internal source of truth");
});

// 17
await test("privacy/security boundary says no persistent client/matter storage", () => {
  check(fx.privacySecurityBoundary.noPersistentClientMatterStorage === true, "no persistent client/matter storage");
});

// 18
await test("privacy/security boundary says no generated work-product persistence", () => {
  check(fx.privacySecurityBoundary.noGeneratedWorkProductPersistence === true, "no generated work-product persistence");
});

// 19
await test("privacy/security boundary says no memory activation", () => {
  check(fx.privacySecurityBoundary.noMemoryActivation === true, "no memory activation");
});

// 20
await test("privacy/security boundary says no third-party egress", () => {
  check(fx.privacySecurityBoundary.noThirdPartyEgress === true, "no third-party egress");
});

// 21
await test("request-size policy placeholder exists", () => {
  const r = fx.requestSizePolicyPlaceholder;
  check(r && r.placeholderOnly === true && r.notImplemented === true, "request-size placeholder present and not implemented");
  check(Array.isArray(r.requiredBeforeLargeInputs) && r.requiredBeforeLargeInputs.length > 0, "required-before-large-inputs list present");
});

// 22
await test("output schemas exist for all six initial modes", () => {
  const s = fx.outputSchemas;
  for (const key of [
    "taxMemoOutput",
    "birReplyDraftOutput",
    "auditDefenseMatrixOutput",
    "clientAdvisoryOutput",
    "complianceChecklistOutput",
    "requirementsRequestLetterOutput"
  ]) {
    check(s && typeof s[key] === "object" && s[key] !== null, `schema present: ${key}`);
    check(Object.prototype.hasOwnProperty.call(s[key], "sourceCards"), `${key} has sourceCards`);
    check(Object.prototype.hasOwnProperty.call(s[key], "missingFacts"), `${key} has missingFacts`);
  }
});

// 23
await test("future patch plan includes PHASE-09B through PHASE-09H", () => {
  check(hasAll(fx.futurePatchPlan, [
    "PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1",
    "PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1",
    "PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1",
    "PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1",
    "PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1",
    "PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1",
    "PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1"
  ]), "future patch plan B-H present");
});

// 24
await test("Phase 9 exit criteria exist", () => {
  check(Array.isArray(fx.phase9ExitCriteria) && fx.phase9ExitCriteria.length >= 6, "exit criteria present");
  check(hasAll(fx.phase9ExitCriteria, ["source-card requirement enforced", "human-review disclaimers"]), "key exit criteria present");
});

// 25
await test("risk register includes required risks", () => {
  check(hasAll(fx.riskRegister, [
    "hallucinated legal citations",
    "outdated authorities",
    "missing facts",
    "client confidentiality",
    "excessive request size",
    "external egress",
    "tenant isolation gap"
  ]), "required risks present");
});

// 26
await test("prohibited claims include the mandated non-claims", () => {
  check(hasAll(fx.prohibitedClaims, [
    "production ready",
    "memory enabled",
    "external search implemented",
    "n8n implemented",
    "Firecrawl implemented",
    "Crawlee implemented",
    "tenant isolation implemented",
    "logging redaction completed",
    "egress controls completed",
    "BM25",
    "re-ranking implemented"
  ]), "required prohibited claims present");
});

// 27
await test("next task is PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1", "next task PHASE-09B");
});

// 28
await test("this test performs no HTTP/API/network calls and reads no env vars", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/[^"'`.\w]fetch\s*\(|https?\.(request|get)\s*\(/.test(selfSrc), "no HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads");
  // Every import in this file must resolve to a node: builtin — no runtime
  // service SDKs, no server.js, no route/pipeline modules. Service names appear
  // only as string literals inside validation arrays, which this does not flag.
  const importTargets = [...selfSrc.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length > 0, "import targets discovered");
  for (const target of importTargets) {
    check(target.startsWith("node:"), `only node: builtins may be imported (found: ${target})`);
  }
});

// Design-doc content spot-checks (design doc, not just fixture)
await test("design doc contains required section markers", () => {
  const doc = readFileSync(resolve(DESIGN_DOC_PATH), "utf8");
  for (const marker of [
    "Professional Workflow Co-Pilot",
    "## 2. Phase Boundary",
    "## 6. Retrieval Contract",
    "## 7. Authority Discipline",
    "## 8. Source Card Requirements",
    "## 12. Professional Output Schemas",
    "## 13. Phase 9 Patch Plan",
    "PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1"
  ]) {
    check(doc.includes(marker), `design doc missing: ${marker}`);
  }
});

// PASS-decision consistency
await test("if decision PASS: retrieval existing-only, no fabricated citations, no memory activation", () => {
  if (isPass()) {
    check(fx.retrievalContract.existingRetrievalOnly === true, "PASS requires existing retrieval only");
    check(fx.retrievalContract.noLiveWebSearch === true, "PASS requires no live web search");
    check(fx.authorityDiscipline.noFabricatedCitations === true, "PASS requires no fabricated citations");
    check(fx.privacySecurityBoundary.noMemoryActivation === true, "PASS requires no memory activation");
    check(fx.nonRuntimePatch.designOnly === true, "PASS requires design-only");
  }
});

console.log(`\nPHASE-09A-PROFESSIONAL-WORKFLOW-COPILOT-DESIGN-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
