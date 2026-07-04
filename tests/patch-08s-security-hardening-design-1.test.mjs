// PATCH-08S-SECURITY-HARDENING-DESIGN-1 - design-only report validation.
// This test does NOT import runtime routes/server/pipeline. It only reads the
// design report as text and asserts required sections, patch names, pre-Phase-9
// blockers, and classification statements are present. No runtime side effects.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REPORT_PATH = "PATCH-08S-SECURITY-HARDENING-DESIGN-1_SECURITY_ARCHITECTURE_THREAT_MODEL_REPORT.md";

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

await test("design report file exists", () => {
  check(existsSync(resolve(REPORT_PATH)), `${REPORT_PATH} must exist`);
});

const report = readFileSync(resolve(REPORT_PATH), "utf8");
// Normalized view: strip markdown emphasis and collapse whitespace/newlines so
// content assertions are tolerant of line-wrapping and **bold** formatting.
const norm = report.replace(/\*/g, "").replace(/\s+/g, " ");

await test("required top-level sections are present", () => {
  const requiredSections = [
    "## 1. Patch name and purpose",
    "## 2. Reviewers and decisions",
    "## 3. Base repo state",
    "## 4. Executive summary",
    "## 5. Threat model scope",
    "## 6. Trust boundaries",
    "## 7. Data sensitivity classification",
    "## 8. Attack surface inventory summary",
    "## 9. STRIDE threat model",
    "## 10. Key findings and severity table",
    "## 11. Pre-Phase-9 blockers",
    "## 12. Non-negotiable future fixture policies",
    "## 13. Phase 8S roadmap",
    "## 14. Separate Phase 8X diagnostic",
    "## 15. Out-of-scope boundaries",
    "## 16. Required validation",
    "## 17. Final design decision",
    "## 18. Strict recommendations",
    "## 19. Next required task"
  ];
  for (const section of requiredSections) {
    check(report.includes(section), `missing section: ${section}`);
  }
});

await test("final design decision is DESIGN PASS WITH STRICT RECOMMENDATIONS", () => {
  check(report.includes("DESIGN PASS WITH STRICT RECOMMENDATIONS"), "final decision must be present");
});

await test("both reviewers and Gemini-controls rule are recorded", () => {
  check(report.includes("Claude Code (Opus)"), "Claude Opus baseline review must be cited");
  check(report.includes("ADVERSARIAL DESIGN PASS WITH STRICT RECOMMENDATIONS"), "Gemini decision must be present");
  check(/Gemini controls|Gemini is stricter|Gemini controls\.|Gemini controlling/i.test(report), "Gemini-controls rule must be present");
});

await test("full Phase 8S roadmap patch names appear in order-bearing sequence", () => {
  const patches = [
    "PATCH-08S-SECURITY-HARDENING-DESIGN-1",
    "PATCH-08S-SECURITY-ROUTE-INVENTORY-1",
    "PATCH-08S-SECURITY-POLICY-FIXTURE-1",
    "PATCH-08S-TENANT-ISOLATION-GATE-1",
    "PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1",
    "PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1",
    "PATCH-08S-STAGING-SECURITY-SMOKE-1",
    "PATCH-08S-FINAL-CLOSURE-GATE-1"
  ];
  for (const patch of patches) {
    check(report.includes(patch), `missing Phase 8S patch: ${patch}`);
  }
});

await test("pre-Phase-9 blockers section lists the mandatory gates", () => {
  const blockers = [
    "PATCH-08S-SECURITY-ROUTE-INVENTORY-1",
    "PATCH-08S-SECURITY-POLICY-FIXTURE-1",
    "PATCH-08S-TENANT-ISOLATION-GATE-1",
    "PATCH-08S-SECRETS-ENV-LOGGING-SAFETY-GATE-1",
    "PATCH-08S-SECURITY-HEADERS-CORS-RATE-LIMIT-SCAFFOLD-1",
    "PATCH-08S-STAGING-SECURITY-SMOKE-1",
    "PATCH-08S-FINAL-CLOSURE-GATE-1"
  ];
  const blockerSection = report.slice(report.indexOf("## 11. Pre-Phase-9 blockers"));
  for (const blocker of blockers) {
    check(blockerSection.includes(blocker), `blocker section missing: ${blocker}`);
  }
});

await test("tenant isolation and service-role are calibrated as CRITICAL", () => {
  check(norm.includes("isolation architecture missing"), "tenant isolation must be a finding");
  check(norm.includes("CRITICAL"), "CRITICAL severity must be used");
  check(norm.includes("server-only administrative / source-corpus operations"), "disciplined service-role wording must be present");
  check(norm.includes("default access path for user/client/matter data"), "service-role default-path prohibition must be present");
});

await test("chat context carryover is classified as Phase 8X, not Phase 8S", () => {
  check(norm.includes("PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1"), "08X diagnostic must be recorded");
  const x = norm.slice(norm.indexOf("14. Separate Phase 8X diagnostic"));
  check(/not a Phase 8S security patch/i.test(x), "08X must be stated as not Phase 8S");
  check(/not persistent memory/i.test(x), "08X must be stated as not persistent memory");
});

await test("Phase 9 remains Professional Workflow Co-Pilot and memory stays inactive", () => {
  check(report.includes("Professional Workflow Co-Pilot"), "Phase 9 name must be preserved");
  check(/Phase 8 memory.*inactive|memory.*inactive/i.test(report), "Phase 8 memory must be stated inactive");
  check(report.includes("TINA_ENABLE_MEMORY_"), "memory flags must be referenced as OFF");
});

await test("report claims no runtime implementation", () => {
  check(/No runtime implementation|report-only design patch/i.test(report), "must state report-only / no runtime implementation");
  check(/No\s+`?package\.json`?/i.test(report) || report.includes("No `package.json`"), "must state no package changes");
});

console.log(`\nPATCH-08S-SECURITY-HARDENING-DESIGN-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
