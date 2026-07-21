// PHASE-10A14-R18 — 09ZF scope-guard negative controls (P1-R17-IR1-004).
//
// The R18 remedy narrows the 09ZF allowed-file CLASSIFICATION so evidence artifacts are
// not reported as runtime/package/env/database/frontend/production changes. This suite
// proves the narrowing did not weaken the guard: every prohibited class is still caught,
// and every ignored class has an explicit control.
//
// It performs NO repository mutation. The guard logic is re-implemented here exactly as
// the 09ZF suite applies it and exercised against synthetic change lists, so that planting
// real forbidden files is unnecessary. Condition C in PRE_FIX_09ZF_MATRIX.json separately
// proves the real suite fails on a real planted server.js change.
import fs from "node:fs";

const PATCH = "PHASE-10A14-R18-09ZF-SCOPE-GUARD";
let passed = 0, failed = 0, assertions = 0;
const check = (cond, label) => { assertions++; if (!cond) throw new Error(`assertion failed: ${label}`); };
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}

const SUITE = "tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs";
const src = fs.readFileSync(SUITE, "utf8");

// Mirror of the guard as the 09ZF suite applies it.
const isEvidenceArtifact = (name) =>
  /^evaluation\/results\//.test(name) ||
  /^reviews\//.test(name) ||
  /^PHASE-[0-9A-Za-z-]+_REPORT\.md$/.test(name);

const ALLOWED = new Set([
  "pipeline.js",
  "evaluation/fixtures/phase-09zf-controlled-loa-gate-ordering-remediation-1.fixture.json",
  "tests/phase-09zf-controlled-loa-gate-ordering-remediation-1.test.mjs",
  "PHASE-09ZF-CONTROLLED-LOA-GATE-ORDERING-REMEDIATION-1_REPORT.md",
  "knowledge/CURRENT_STATE.md",
  "tests/phase-09zb-controlled-loa-answer-staging-smoke-1.test.mjs",
  "evaluation/fixtures/phase-09zb-controlled-loa-answer-staging-smoke-1.fixture.json"
]);

/** Returns the list of guard violations for a synthetic change list. */
function guardViolations(changed) {
  const v = [];
  for (const name of changed) {
    if (isEvidenceArtifact(name)) continue;
    if (!ALLOWED.has(name)) v.push(`changed file is allowed: ${name}`);
  }
  for (const forbidden of ["server.js", "ask-handler.js", "package.json", "package-lock.json", ".env"]) {
    if (changed.includes(forbidden)) v.push(`${forbidden} unchanged`);
  }
  if (changed.some((n) => /^routes\//i.test(n))) v.push("no route file changed");
  if (changed.some((n) => /auth/i.test(n))) v.push("no auth file changed");
  if (changed.some((n) => /supabase|migration|database|embedding/i.test(n))) v.push("no DB/embedding file changed");
  if (changed.some((n) => /frontend|public|production|deploy/i.test(n))) v.push("no frontend/production file changed");
  if (changed.some((n) => /workflow[\\/]controlled-loa-answer-runtime-scaffold\.js/i.test(n))) v.push("scaffold unchanged");
  return v;
}

// ─── The guard must still fail on every prohibited class ─────────────────────
await test("every mandated prohibited class is still caught", () => {
  const mustFail = {
    "server.js": ["server.js"],
    "ask-handler.js": ["ask-handler.js"],
    "routes": ["routes/ask.js"],
    "auth files": ["middleware/auth-guard.js"],
    "package.json": ["package.json"],
    "package-lock.json": ["package-lock.json"],
    ".env": [".env"],
    "database/migration": ["db/migrations/001_init.sql"],
    "supabase": ["services/supabase-client.js"],
    "retrieval/reranker": ["services/embedding-reranker.js"],
    "frontend": ["frontend/src/App.tsx"],
    "public": ["public/index.html"],
    "production": ["production/config.json"],
    "deploy": ["deploy/render.yaml"],
    "controlled LOA runtime scaffold": ["workflow/controlled-loa-answer-runtime-scaffold.js"],
    "planted forbidden runtime marker": ["services/philippine-tax-domain-boundary.js"]
  };
  for (const [label, changed] of Object.entries(mustFail)) {
    check(guardViolations(changed).length > 0, `guard still fails on ${label}: ${changed[0]}`);
  }
});

await test("a prohibited file is caught even if placed inside an evidence directory", () => {
  // The prohibited-class checks run against the COMPLETE unfiltered list, so evidence
  // classification cannot be used to smuggle a forbidden change through.
  check(guardViolations(["evaluation/results/phase-10a14-r18/x.json", "server.js"]).length > 0,
        "server.js alongside evidence is still caught");
  check(guardViolations(["evaluation/results/r18/frontend-deploy.js"]).length > 0,
        "a frontend/deploy-named path under evidence is still caught");
  check(guardViolations(["evaluation/results/r18/supabase-migration.sql"]).length > 0,
        "a database-named path under evidence is still caught");
});

// ─── The ignored classes are exactly the intended ones ───────────────────────
await test("only evidence and report artifacts are classified as non-runtime", () => {
  for (const ok of [
    "evaluation/results/phase-10a14-r18/PREFLIGHT.json",
    "evaluation/results/phase-10a14-r18-independent-review-1/notes.md",
    "reviews/SOME_REVIEW.md",
    "PHASE-10A14-R18-SOMETHING_REPORT.md"
  ]) check(isEvidenceArtifact(ok), `classified as evidence: ${ok}`);

  for (const notEvidence of [
    "server.js", "pipeline.js", "services/philippine-tax-domain-boundary.js",
    "package.json", ".env", "tests/phase-10a8-trust-calibration-and-answer-correctness-remediation-1.test.mjs",
    "evaluation/fixtures/some.fixture.json", "scripts/run-regressions.mjs", "knowledge/CURRENT_STATE.md"
  ]) check(!isEvidenceArtifact(notEvidence), `NOT classified as evidence: ${notEvidence}`);
});

await test("the classification is a closed list, not a wildcard over the repository", () => {
  check(!isEvidenceArtifact("evaluation/fixtures/x.json"), "fixtures are not blanket-exempt");
  check(!isEvidenceArtifact("evaluation/factcheck/x.md"), "factcheck is handled by protected-path logic, not this list");
  check(!isEvidenceArtifact("tests/anything.test.mjs"), "tests are not blanket-exempt");
  check(!isEvidenceArtifact("services/anything.js"), "services are never exempt");
  check(!isEvidenceArtifact("README.md"), "arbitrary top-level files are not exempt");
  check(!isEvidenceArtifact("SOME_REPORT.md"), "a report name must carry a PHASE- prefix");
});

// ─── The real suite carries the remedy ───────────────────────────────────────
await test("the 09ZF suite carries the narrowed classification and keeps its prohibited checks", () => {
  check(/function isEvidenceArtifact/.test(src), "classification helper present in the 09ZF suite");
  check(/if \(isEvidenceArtifact\(name\)\) continue;/.test(src), "allowlist check skips evidence artifacts");
  for (const kept of [
    '"server.js", "ask-handler.js", "package.json", "package-lock.json", ".env"',
    "no route file changed", "no auth file changed",
    "no DB/embedding file changed", "no frontend/production file changed",
    "controlled LOA runtime scaffold unchanged"
  ]) check(src.includes(kept), `prohibited-class check retained: ${kept}`);
  check(!/isEvidenceArtifact/.test(src.split("for (const forbidden of")[1] || ""),
        "prohibited-class checks are not filtered by the classification");
});

await test("the guard is not disabled and no arbitrary runtime file is excluded", () => {
  check(!/\.skip|xtest|return;\s*\/\/ disabled/.test(src), "assertion not skipped or disabled");
  const evidenceOnly = ["evaluation/results/phase-10a14-r18/a.json", "reviews/b.md", "PHASE-X_REPORT.md"];
  check(guardViolations(evidenceOnly).length === 0, "a pure-evidence change list passes");
  check(guardViolations([...evidenceOnly, "server.js"]).length > 0, "adding one runtime file fails it");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
