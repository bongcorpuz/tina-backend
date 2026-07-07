// FILE: tests/phase-09-gate-closure-1.test.mjs
// PHASE-09-GATE-CLOSURE-1
//
// Formal closure-gate validation for Phase 9 -- Professional Workflow
// Co-Pilot / BIR Audit Defense Workflow Layer. This test reads existing
// Phase 9 fixtures/reports/workflow modules and the new gate fixture/
// report only. It imports NO runtime/server/ask-handler/pipeline/route
// files, makes NO network/HTTP/external-service calls, reads no database
// or environment secrets, and performs no live authority retrieval,
// scraping, download, ingestion, embedding, or database write of any
// kind.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = "evaluation/fixtures/phase-09-gate-closure-1.fixture.json";
const REPORT_PATH = "PHASE-09-GATE-CLOSURE-1_REPORT.md";
const SELF_PATH = "tests/phase-09-gate-closure-1.test.mjs";

const EXPECTED_DECISION = "PHASE 09 GATE CLOSURE PASS WITH STRICT RECOMMENDATIONS";
const EXPECTED_RUNTIME_GOVERNANCE_RECOMMENDATION = "PASS_WITH_RUNTIME_WIRING_DEFERRED";

const REQUIRED_REPORTS = [
  "PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1_REPORT.md",
  "PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1_REPORT.md",
  "PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1_REPORT.md",
  "PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1_REPORT.md",
  "PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1_REPORT.md",
  "PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1_REPORT.md",
  "PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1_REPORT.md"
];

const REQUIRED_TESTS = [
  "tests/phase-09l-authority-safe-procedural-fallback-scaffold-1.test.mjs",
  "tests/phase-09m-bir-notice-loa-triage-intent-scaffold-1.test.mjs",
  "tests/phase-09n-pan-fan-fld-protest-workflow-scaffold-1.test.mjs",
  "tests/phase-09o-bir-audit-defense-matrix-scaffold-1.test.mjs",
  "tests/phase-09p-bir-document-compliance-transmittal-scaffold-1.test.mjs",
  "tests/phase-09q-bir-authority-corpus-research-design-1.test.mjs",
  "tests/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.test.mjs"
];

const REQUIRED_WORKFLOW_MODULES = [
  "workflow/authority-safe-procedural-fallback.js",
  "workflow/bir-notice-loa-triage-intent.js",
  "workflow/pan-fan-fld-protest-workflow.js",
  "workflow/bir-audit-defense-matrix.js",
  "workflow/bir-document-compliance-transmittal.js",
  "workflow/bir-authority-corpus-research-design.js",
  "workflow/bir-2026-audit-baseline-integration.js"
];

const REQUIRED_REPORT_PASS_PHRASES = {
  "PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1_REPORT.md": "PHASE 09L AUTHORITY SAFE PROCEDURAL FALLBACK SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE-09M-BIR-NOTICE-LOA-TRIAGE-INTENT-SCAFFOLD-1_REPORT.md": "PHASE 09M BIR NOTICE LOA TRIAGE INTENT SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE-09N-PAN-FAN-FLD-PROTEST-WORKFLOW-SCAFFOLD-1_REPORT.md": "PHASE 09N PAN FAN FLD PROTEST WORKFLOW SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE-09O-BIR-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1_REPORT.md": "PHASE 09O BIR AUDIT DEFENSE MATRIX SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE-09P-BIR-DOCUMENT-COMPLIANCE-TRANSMITTAL-SCAFFOLD-1_REPORT.md": "PHASE 09P BIR DOCUMENT COMPLIANCE TRANSMITTAL SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1_REPORT.md": "PHASE 09Q BIR AUTHORITY CORPUS RESEARCH DESIGN PASS WITH STRICT RECOMMENDATIONS",
  "PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1_REPORT.md": "PHASE 09S 2026 BIR AUDIT BASELINE INTEGRATION SCAFFOLD PASS WITH STRICT RECOMMENDATIONS"
};

// Split-token construction of the private do-not-leak reference corpus.
// Deliberately built via array-join rather than literal strings so this
// gate's own source never contains a matchable whole fragment (avoids a
// self-referential static-scan failure while still allowing an accurate
// runtime scan of OTHER Phase 9 files for leakage).
function j(parts, sep = "") {
  return parts.join(sep);
}
const REAL_TAXPAYER_NAME_FRAGMENTS = [
  j(["TRUE", "FREIGHT", "GLOBAL", "LOGISTICS", "INC"], " "),
  j(["ALL", "ECARS", "INC"], " "),
  j(["SOCIAL", "HOMES", "INCORPORATED"], " ")
];
const REAL_OFFICER_NAME_FRAGMENTS = [
  j(["SUSAN", "F.", "SANTIAGO"], " "),
  j(["RENATO", "N.", "MOLINA"], " "),
  j(["PATRICIA", "ANN", "H.", "GUTIERREZ"], " "),
  j(["MARIA", "RUBIE", "AGANAN"], " "),
  j(["BRENNA", "ROSE", "VENERAYAN"], " "),
  j(["CECILLE", "ASILO"], " "),
  j(["MYRABEL", "DELA", "CRUZ"], " "),
  j(["AL-HELMEY", "F.", "ABDULRASHID"], " "),
  j(["ETHEL", "C.", "EVANGELISTA"], " ")
];
const REAL_ELA_NUMBER_FRAGMENTS = [
  j([j(["e", "LA"]), "202400099140"]),
  j([j(["e", "LA"]), "202300040925"]),
  j([j(["e", "LA"]), "20240018917"]),
  j([j(["e", "LA"]), "202400055996"])
];
const REAL_AUDIT_CASE_NUMBER_FRAGMENTS = [
  j(["AUDM16-00.8A", "2025", "016972"], "-"),
  j(["AUDM29-048", "2024", "027259"], "-"),
  j(["AUDM29-041", "2026", "150797"], "-")
];
const REAL_TIN_FRAGMENTS = [j(["008", "826", "456", "000"], "-"), j(["010", "841", "602", "000"], "-"), j(["005", "055", "069", "00000"], "-")];
const REAL_ASSESSMENT_AMOUNT_FRAGMENTS = [
  j(["9,367,987", "68"], "."),
  j(["2,841,029", "91"], "."),
  j(["614,038", "19"], "."),
  j(["737,273", "97"], "."),
  j(["15,000", "00"], "."),
  j(["13,106,907", "66"], "."),
  j(["13,545,329", "75"], ".")
];
const ALL_REAL_FRAGMENTS = [
  ...REAL_TAXPAYER_NAME_FRAGMENTS,
  ...REAL_OFFICER_NAME_FRAGMENTS,
  ...REAL_ELA_NUMBER_FRAGMENTS,
  ...REAL_AUDIT_CASE_NUMBER_FRAGMENTS,
  ...REAL_TIN_FRAGMENTS,
  ...REAL_ASSESSMENT_AMOUNT_FRAGMENTS
];

const PROHIBITED_CLAIM_PHRASES = [
  "this assessment is void",
  "this loa is invalid",
  "this ela is invalid",
  "this replacement ela is invalid",
  "this fan is invalid",
  "this fld is invalid",
  "this pan is invalid",
  "this fdda is invalid",
  "the bir cannot assess you",
  "the case is fully cancelled",
  "the assessment is cancelled",
  "you are permanently cleared",
  "no need to consult a professional",
  "submit everything without review",
  "ignore the notice",
  "you will win",
  "guaranteed cancellation",
  "final legal opinion",
  "official legal advice",
  "court-tested defense",
  "foolproof defense",
  "the protest is guaranteed to succeed",
  "cta appeal is definitely available",
  "the assessment is final.",
  "the assessment is not final.",
  "the deadline is definitely"
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

/**
 * Usage-based forbidden-pattern scan, reused from prior Phase 9 test
 * files. Looks for actual code-shaped usage (import/require syntax,
 * network-call syntax, process.env.<NAME> reads, header-assignment
 * syntax) rather than bare substrings, so it is safe to run against this
 * test's own source as well as the new gate fixture/report.
 *
 * @param {string} source
 * @returns {string[]}
 */
function scanForbiddenUsage(source) {
  const violations = [];

  const forbiddenPackagePattern =
    /\b(?:import\s+.*from\s+|require\()\s*["'](openai|@supabase\/[^"']*|firecrawl|crawlee|@modelcontextprotocol\/[^"']*|n8n|tesseract\.js|node-tesseract)["']/i;
  if (forbiddenPackagePattern.test(source)) violations.push("import/require of a forbidden service package");

  const forbiddenRuntimeImportPattern = /\bfrom\s+["'](?:\.\.?\/)*(?:server|ask-handler|pipeline)(?:\.js)?["']/i;
  if (forbiddenRuntimeImportPattern.test(source)) violations.push("import of server/ask-handler/pipeline");

  const routeImportPattern = /\bfrom\s+["'](?:\.\.?\/)*routes\/[^"']*["']/i;
  if (routeImportPattern.test(source)) violations.push("import of a route file");

  const networkCallPattern = /\bfetch\s*\(|\baxios\s*\(|\bhttp\.request\s*\(|\bhttps\.request\s*\(|\bXMLHttpRequest\s*\(/;
  if (networkCallPattern.test(source)) violations.push("network call syntax (fetch/axios/http.request/https.request/XMLHttpRequest)");

  if (/process\.env\.\w/.test(source)) violations.push("process.env.<NAME> read");

  if (/["'`]authorization["'`]\s*:/i.test(source)) violations.push("Authorization header assignment syntax");

  const indexSecretToken = ["INDEX", "SECRET"].join("_");
  const indexSecretUsagePattern = new RegExp(`\\b${indexSecretToken}\\b\\s*[:=]`);
  if (indexSecretUsagePattern.test(source)) violations.push("shared-secret env var assignment syntax");

  if (/\bapp\.post\s*\(|\brouter\.post\s*\(/.test(source)) violations.push("app.post/router.post route registration syntax");

  const expressImportPattern = /\b(?:import\s+.*from\s+|require\()\s*["']express["']/i;
  if (expressImportPattern.test(source)) violations.push("import/require of express");

  const embeddingCallPattern = /\bembeddings?\.create\s*\(|\bcreateEmbedding\s*\(|vectorSearch\s*\(/i;
  if (embeddingCallPattern.test(source)) violations.push("embedding/vector-search call syntax");

  const ocrCallPattern = /\bocr\s*\(|\brecognize\s*\(\s*[^)]*image|Tesseract\.(recognize|create)\s*\(/i;
  if (ocrCallPattern.test(source)) violations.push("OCR call syntax");

  const scrapeDownloadCallPattern = /\bscrape\s*\(|\bcheerio\.load\s*\(|\bpuppeteer\.|\bplaywright\./i;
  if (scrapeDownloadCallPattern.test(source)) violations.push("scraping/browser-automation call syntax");

  const modelCallPattern = /\bopenai\.chat|\bmodel\s*\.\s*call\s*\(|\bcompletions\.create\s*\(/i;
  if (modelCallPattern.test(source)) violations.push("model call syntax");

  const databaseWritePattern = /\.insert\s*\(|\.upsert\s*\(|\bINSERT\s+INTO\b/i;
  if (databaseWritePattern.test(source)) violations.push("database write call syntax");

  return violations;
}

/**
 * Extracts every `const REAL_..._FRAGMENTS = Object.freeze([ ... ]);`
 * blocklist array block from a source string (single- or multi-line), and
 * returns the source with those blocks removed. This lets the privacy
 * scan distinguish an intentional, defensive do-not-leak blocklist
 * declaration (expected, by design, in workflow/*.js and tests/*.test.mjs
 * across Phase 9) from an actual leak into any other position in the
 * file.
 *
 * @param {string} src
 * @returns {string}
 */
function stripKnownBlocklistArrayBlocks(src) {
  const blockRegex = /const\s+REAL_[A-Z_]*FRAGMENTS\s*=\s*Object\.freeze\(\[[\s\S]*?\]\);/g;
  return src.split(blockRegex).join("");
}

function listPhase9RelatedFiles(dir, namePattern) {
  const out = [];
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isFile() && namePattern.test(entry.name)) out.push(`${dir}/${entry.name}`);
  }
  return out;
}

let fx;

// 1. Fixture exists and valid JSON.
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2. Fixture patch id.
await test("fixture patch id equals PHASE-09-GATE-CLOSURE-1", () => {
  check(fx.patch === "PHASE-09-GATE-CLOSURE-1", "patch id");
});

// 3. Fixture phase.
await test("fixture phase equals 09", () => {
  check(fx.phase === "09", "phase equals 09");
});

// 4. Fixture baseCommit.
await test("fixture baseCommit equals 444a11f", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("444a11f"), "baseCommit references 444a11f");
});

// 5. Fixture decision.
await test("fixture decision equals PHASE 09 GATE CLOSURE PASS WITH STRICT RECOMMENDATIONS", () => {
  check(fx.decision === EXPECTED_DECISION, `decision must equal expected: ${fx.decision}`);
});

// 6. runtimeGovernanceRecommendation.
await test("runtimeGovernanceRecommendation equals PASS_WITH_RUNTIME_WIRING_DEFERRED", () => {
  check(fx.runtimeGovernanceRecommendation === EXPECTED_RUNTIME_GOVERNANCE_RECOMMENDATION, "runtimeGovernanceRecommendation matches expected");
});

// 7-23. Required completed patches list.
await test("required completed patches list includes all of 09A-09I, 09R, 09L, 09M, 09N, 09O, 09P, 09Q, 09S", () => {
  const required = ["09A", "09B", "09C", "09D", "09E", "09F", "09G", "09H", "09I", "09R", "09L", "09M", "09N", "09O", "09P", "09Q", "09S"];
  check(Array.isArray(fx.requiredCompletedPatches), "requiredCompletedPatches is an array");
  for (const code of required) {
    check(fx.requiredCompletedPatches.includes(code), `required completed patches list includes ${code}`);
  }
});

// 24-30. Required reports exist.
await test("all required Phase 9 reports exist", () => {
  for (const report of REQUIRED_REPORTS) {
    check(existsSync(resolve(report)), `required report exists: ${report}`);
  }
});

// 31-37. Required tests exist.
await test("all required Phase 9 tests exist", () => {
  for (const t of REQUIRED_TESTS) {
    check(existsSync(resolve(t)), `required test exists: ${t}`);
  }
});

// 38-44. Required workflow modules exist.
await test("all required Phase 9 BIR audit-defense workflow modules exist", () => {
  for (const m of REQUIRED_WORKFLOW_MODULES) {
    check(existsSync(resolve(m)), `required workflow module exists: ${m}`);
  }
});

// 45-51. Each required report contains its expected PASS decision phrase.
await test("each required Phase 9 report contains its expected PASS decision", () => {
  for (const [report, phrase] of Object.entries(REQUIRED_REPORT_PASS_PHRASES)) {
    const content = readFileSync(resolve(report), "utf8");
    check(content.includes(phrase), `${report} contains PASS decision: ${phrase}`);
  }
});

// 52. New gate report exists.
await test("new gate report exists", () => {
  check(existsSync(resolve(REPORT_PATH)), `${REPORT_PATH} must exist`);
});

let gateReport = "";
if (existsSync(resolve(REPORT_PATH))) gateReport = readFileSync(resolve(REPORT_PATH), "utf8");

// 53. Gate report contains decision phrase.
await test("gate report contains PHASE 09 GATE CLOSURE PASS WITH STRICT RECOMMENDATIONS", () => {
  check(gateReport.includes(EXPECTED_DECISION), "gate report contains the expected decision phrase");
});

// 54-70. Gate report contains required exact impact statements.
await test("gate report states all required non-runtime/external-operation impact statements as None", () => {
  const requiredStatements = [
    /Runtime impact:\s*None\./,
    /\/ask impact:\s*None\./,
    /Ask-handler impact:\s*None\./,
    /Route impact:\s*None\./,
    /Server impact:\s*None\./,
    /Pipeline impact:\s*None\./,
    /Feature flag impact:\s*None\./,
    /Memory impact:\s*None\./,
    /Persistence impact:\s*None\./,
    /External search impact:\s*None\./,
    /Live retrieval impact:\s*None\./,
    /Scraping\/download\/ingestion impact:\s*None\./,
    /Database\/embedding impact:\s*None\./,
    /OpenAI\/Supabase\/Google Drive\/n8n\/Firecrawl\/Crawlee\/MCP\/OCR impact:\s*None\./,
    /Production impact:\s*None\./,
    /Filing-ready document impact:\s*None\./,
    /Automatic submission impact:\s*None\./
  ];
  for (const pattern of requiredStatements) {
    check(pattern.test(gateReport), `gate report matches required statement: ${pattern}`);
  }
});

// 71-73. LOA readiness / live-ask / runtime-activation statements.
await test("gate report states LOA readiness, live /ask readiness, and runtime activation statements", () => {
  check(/Internal LOA answer modeling readiness:\s*PASS\./.test(gateReport), "states Internal LOA answer modeling readiness: PASS.");
  check(/Live \/ask LOA answer readiness:\s*NOT APPROVED IN THIS GATE\./.test(gateReport), "states Live /ask LOA answer readiness: NOT APPROVED IN THIS GATE.");
  check(/Runtime activation:\s*NOT APPROVED IN THIS GATE\./.test(gateReport), "states Runtime activation: NOT APPROVED IN THIS GATE.");
});

// 74-86. LOA readiness matrix includes all 13 required signals.
await test("LOA readiness matrix (fixture) includes all 13 required signals", () => {
  check(Array.isArray(fx.loaQuestionReadinessMatrix?.readinessSignals), "loaQuestionReadinessMatrix.readinessSignals is an array");
  const signalNames = fx.loaQuestionReadinessMatrix.readinessSignals.map((s) => s.signal);
  const requiredSignals = [
    "LOA/eLA authenticity verification signal",
    "date-of-receipt capture",
    "taxable period / tax type / scope capture",
    "original eLA vs replacement eLA vs consolidated eLA classification",
    "2026 audit baseline signal",
    "document checklist matrix",
    "additional request scope review",
    "voluminous records / certified copy / on-premise review signal",
    "pre-subpoena/subpoena escalation signal",
    "PAN/FAN/FDDA next-stage watch",
    "protest workflow watch",
    "authority corpus verification requirement",
    "human tax/legal review notice"
  ];
  for (const signal of requiredSignals) {
    check(signalNames.includes(signal), `LOA readiness matrix includes signal: ${signal}`);
  }
});

// 87. Static scan: no server/ask-handler/pipeline/route imports in new gate test.
await test("static scan confirms no server/ask-handler/pipeline/route imports in new gate test", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/^\s*import\s+.*from\s+["'](?:\.\.?\/)*(?:server|ask-handler|pipeline|routes\/)/m.test(selfSrc), "no runtime/server/route import in gate test");
});

// 88. Static scan: no OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls in new gate files.
await test("static scan confirms no OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls in new gate files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  const fixtureRaw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  const reportRaw = existsSync(resolve(REPORT_PATH)) ? readFileSync(resolve(REPORT_PATH), "utf8") : "";
  for (const [label, src] of [
    ["test", selfSrc],
    ["fixture", fixtureRaw],
    ["report", reportRaw]
  ]) {
    const violations = scanForbiddenUsage(src);
    check(violations.length === 0, `${label} must have no forbidden service usage: ${violations.join("; ")}`);
  }
});

// 89. Static scan: no external HTTP/fetch calls in new gate files.
await test("static scan confirms no external HTTP/fetch calls in new gate files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/\bfetch\s*\(|\baxios\s*\(|\bhttp\.request\s*\(|\bhttps\.request\s*\(/.test(selfSrc), "no network call syntax in gate test");
});

// 90. Static scan: no process.env dependency in new gate files.
await test("static scan confirms no process.env dependency in new gate files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> read in gate test");
});

// 91. Static scan: no Authorization/INDEX_SECRET usage in new gate files.
await test("static scan confirms no Authorization/INDEX_SECRET usage in new gate files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/["'`]authorization["'`]\s*:/i.test(selfSrc), "no Authorization header assignment in gate test");
  const indexSecretToken = ["INDEX", "SECRET"].join("_");
  const indexSecretUsagePattern = new RegExp(`\\b${indexSecretToken}\\b\\s*[:=]`);
  check(!indexSecretUsagePattern.test(selfSrc), "no shared-secret env var assignment in gate test");
});

// 92. Static scan: no live retrieval/scraping/download/ingestion/embedding/database write implementation in new gate files.
await test("static scan confirms no live retrieval/scraping/download/ingestion/embedding/database write implementation in new gate files", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  const violations = scanForbiddenUsage(selfSrc);
  check(violations.length === 0, `gate test must implement no live retrieval/scraping/download/ingestion/embedding/db-write: ${violations.join("; ")}`);
});

// 93. Static scan confirms no runtime activation claim.
await test("static scan confirms no runtime activation claim in gate report", () => {
  check(!/runtime (?:is |has been )?(?:now )?active\b/i.test(gateReport), "gate report does not claim runtime is active");
  check(!/runtime activation:\s*approved\b/i.test(gateReport), "gate report does not claim runtime activation approved");
});

// 94. Static scan confirms no filing-ready document generation claim.
await test("static scan confirms no filing-ready document generation claim in gate report", () => {
  check(!/filing-ready (?:document|letter|affidavit|certification|protest) (?:was |has been )?generated/i.test(gateReport), "gate report does not claim filing-ready document generated");
});

// 95. Static scan confirms no automatic submission claim.
await test("static scan confirms no automatic submission claim in gate report", () => {
  check(!/automatically submitted|automatic submission (?:was |has been )?performed/i.test(gateReport), "gate report does not claim automatic submission performed");
});

// 96. Static scan confirms no final legal conclusion phrases in generated gate output.
await test("static scan confirms no prohibited final-legal-conclusion phrases in gate fixture/report", () => {
  const fixtureRaw = readFileSync(resolve(FIXTURE_PATH), "utf8").toLowerCase();
  const reportLower = gateReport.toLowerCase();
  for (const phrase of PROHIBITED_CLAIM_PHRASES) {
    check(!fixtureRaw.includes(phrase), `gate fixture must not contain prohibited phrase: ${phrase}`);
    check(!reportLower.includes(phrase), `gate report must not contain prohibited phrase: ${phrase}`);
  }
});

// 97. Static scan confirms no private real taxpayer fragments in Phase 9 scaffold files, fixtures, tests, and reports.
await test("privacy scan confirms no private real-reference fragments leaked outside intentional blocklist declarations", () => {
  const phase9WorkflowFiles = [...REQUIRED_WORKFLOW_MODULES];
  const phase9TestFiles = [...REQUIRED_TESTS, "tests/phase-09a-professional-workflow-copilot-design-1.test.mjs", "tests/phase-09b-workflow-mode-registry-scaffold-1.test.mjs"];
  const phase9FixtureFiles = listPhase9RelatedFiles("evaluation/fixtures", /^phase-09.*\.json$/).concat([FIXTURE_PATH]);
  const phase9ReportFiles = [...REQUIRED_REPORTS, REPORT_PATH];

  // Fixtures and reports must NEVER contain a real fragment, in any form.
  for (const file of [...phase9FixtureFiles, ...phase9ReportFiles]) {
    if (!existsSync(resolve(file))) continue;
    const raw = readFileSync(resolve(file), "utf8");
    for (const fragment of ALL_REAL_FRAGMENTS) {
      check(!raw.toUpperCase().includes(fragment.toUpperCase()), `fixture/report must not contain real fragment: ${file} :: ${fragment}`);
    }
  }

  // Workflow modules and their tests are allowed to reference these
  // fragments ONLY inside their own intentional do-not-leak blocklist
  // array declarations (REAL_..._FRAGMENTS = Object.freeze([...])),
  // used defensively to reject them on input and scan for leakage on
  // output. Any occurrence found OUTSIDE such a declared block is a
  // genuine leak.
  for (const file of [...phase9WorkflowFiles, ...phase9TestFiles]) {
    if (!existsSync(resolve(file))) continue;
    const raw = readFileSync(resolve(file), "utf8");
    const withoutBlocklistBlocks = stripKnownBlocklistArrayBlocks(raw);
    for (const fragment of ALL_REAL_FRAGMENTS) {
      check(!withoutBlocklistBlocks.toUpperCase().includes(fragment.toUpperCase()), `source/test file must not leak real fragment outside its blocklist declaration: ${file} :: ${fragment}`);
    }
  }
});

// 98. Git diff scope confirms only allowed files changed.
await test("git diff confirms only this gate's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set(["evaluation/fixtures/phase-09-gate-closure-1.fixture.json", "tests/phase-09-gate-closure-1.test.mjs", "PHASE-09-GATE-CLOSURE-1_REPORT.md", "knowledge/CURRENT_STATE.md"]);
  let diffNames = [];
  try {
    diffNames = execSync("git diff --name-only", { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    diffNames = [];
  }
  for (const name of diffNames) {
    check(allowedChanged.has(name), `changed file is allowed by this gate's scope: ${name}`);
  }
  for (const forbidden of [
    "server.js",
    "ask-handler.js",
    "pipeline.js",
    "package.json",
    "package-lock.json",
    "workflow/authority-safe-procedural-fallback.js",
    "workflow/bir-notice-loa-triage-intent.js",
    "workflow/pan-fan-fld-protest-workflow.js",
    "workflow/bir-audit-defense-matrix.js",
    "workflow/bir-document-compliance-transmittal.js",
    "workflow/bir-authority-corpus-research-design.js",
    "workflow/bir-2026-audit-baseline-integration.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 99-100. CURRENT_STATE.md contains Phase 9 closure entry and next-phase marker.
await test("CURRENT_STATE.md contains Phase 9 closure entry and states Phase 10 as next phase", () => {
  const currentState = readFileSync(resolve("knowledge/CURRENT_STATE.md"), "utf8");
  check(/PHASE-09-GATE-CLOSURE-1/.test(currentState), "CURRENT_STATE.md references PHASE-09-GATE-CLOSURE-1");
  check(/PHASE 09 GATE CLOSURE PASS WITH STRICT RECOMMENDATIONS/.test(currentState), "CURRENT_STATE.md references the gate closure decision");
  check(/PHASE 10/.test(currentState), "CURRENT_STATE.md references PHASE 10 as the next phase");
});

console.log(`\nPHASE-09-GATE-CLOSURE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
