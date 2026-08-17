// PHASE-10A-A15-FINAL-CLOSURE-GATE-V1 - focused test.
//
// Pure fixture-based validation only. NO network, NO real canonical
// repository access, NO writes outside a per-test temp directory under
// os.tmpdir(). This test suite never points the runner at the real
// tina-backend working tree and never executes A15 against real evidence.

import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  loadContract,
  evaluateItem,
  aggregate,
  assertWritePathAllowed,
  evaluate
} from "../evaluation/runner/phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs";

const RUNNER_SOURCE_PATH = path.resolve(
  "evaluation/runner/phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs"
);

let passed = 0;
let failed = 0;
let assertions = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`FAIL ${name}: ${err.message}`);
  }
}

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function makeFixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "a15-fixture-"));
  mkdirSync(path.join(root, "knowledge"), { recursive: true });
  mkdirSync(path.join(root, "evaluation/oracles/phase-10a14-r20"), { recursive: true });
  mkdirSync(
    path.join(root, "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3"),
    { recursive: true }
  );
  return root;
}

function writeSatisfiedCurrentState(root, overrides = {}) {
  const rows = {
    "Deterministic clean/staging closure": "SATISFIED",
    "R4 bounded development-governance review": "ACCEPTED",
    "Post-R4 external-review gate": "SATISFIED",
    ...overrides
  };
  const lines = Object.entries(rows).map(([label, value]) => `| ${label} | \`${value}\` |`);
  writeFileSync(path.join(root, "knowledge/CURRENT_STATE.md"), lines.join("\n") + "\n");
}

function writeOracleCounts(root, total) {
  writeFileSync(
    path.join(root, "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_COUNTS.json"),
    JSON.stringify({ total })
  );
}

function writeE2Evidence(root, verdict) {
  writeFileSync(
    path.join(
      root,
      "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3/E2_EVIDENCE_MANIFEST.sha256"
    ),
    "deadbeef  E2_EXECUTION_RESULT.json\n"
  );
  writeFileSync(
    path.join(
      root,
      "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3_INTERNAL_REVIEW.md"
    ),
    `## Verdict\n\n\`${verdict}\`\n`
  );
}

// --- 1. valid contract parsing/validation ---
test("contract loads and has required top-level fields", () => {
  const contract = loadContract();
  check(contract.identity === "PHASE-10A-A15-FINAL-CLOSURE-GATE-V1", "identity must match");
  check(contract.version === 1, "version must be 1");
  // The roadmap's 11 bullets become 12 exitItems here because "standalone and
  // integrated exact gates" is deliberately split into two separately
  // checkable items (standaloneExactGates, integratedExactGates).
  check(Array.isArray(contract.exitItems) && contract.exitItems.length === 12, "must have 12 exit items");
  check(contract.ownerGovernedBehavior.networkAllowed === false, "network must be disabled");
  check(contract.phase10AClosure.autoClose === false, "must not auto-close Phase 10A");
  check(contract.b2ThroughB6.disposition === "OPEN_UNCHANGED_OUT_OF_SCOPE", "B2-B6 must be out of scope");
});

// --- 2. PASS path via synthetic/fixture evidence (aggregation logic) ---
test("aggregate() reports PASS when every evaluated item is satisfied", () => {
  const allPass = [
    { id: "a", status: "PASS", reason: null },
    { id: "b", status: "PASS", reason: null },
    { id: "c", status: "NOT_APPLICABLE", reason: null }
  ];
  const result = aggregate(allPass);
  check(result.executionStatus === "PASS", "expected PASS, got " + result.executionStatus);
});

test("evaluateItem PRECONDITION_GATE returns PASS-equivalent when satisfied", () => {
  const root = makeFixtureRoot();
  writeSatisfiedCurrentState(root);
  const item = { id: "deterministicCleanCycles", checkMethod: "PRECONDITION_GATE" };
  const result = evaluateItem(item, root);
  check(result.status === "PASS", "expected PASS for satisfied precondition");
  rmSync(root, { recursive: true, force: true });
});

// --- 3. missing evidence -> BLOCKED ---
test("READ_JSON_FIELD_EQUALS returns BLOCKED/MISSING_EVIDENCE when file absent", () => {
  const root = makeFixtureRoot();
  const item = {
    id: "decisionClosure",
    checkMethod: "READ_JSON_FIELD_EQUALS",
    evidenceSource: "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_COUNTS.json",
    evidenceField: "total",
    expectedValue: 3720
  };
  const result = evaluateItem(item, root);
  check(result.status === "BLOCKED", "expected BLOCKED");
  check(result.reason === "MISSING_EVIDENCE", "expected MISSING_EVIDENCE, got " + result.reason);
  rmSync(root, { recursive: true, force: true });
});

// --- 4. D1 prerequisite unsatisfied -> BLOCKED, and dominates aggregation ---
test("PRECONDITION_GATE returns BLOCKED/PRECONDITION_UNSATISFIED when unsatisfied", () => {
  const root = makeFixtureRoot();
  writeSatisfiedCurrentState(root, { "Deterministic clean/staging closure": "UNSATISFIED" });
  const item = { id: "deterministicCleanCycles", checkMethod: "PRECONDITION_GATE" };
  const result = evaluateItem(item, root);
  check(result.status === "BLOCKED", "expected BLOCKED");
  check(result.reason === "PRECONDITION_UNSATISFIED", "expected PRECONDITION_UNSATISFIED");
  rmSync(root, { recursive: true, force: true });
});

test("aggregate() forces overall BLOCKED/PRECONDITION_UNSATISFIED even if other items PASS", () => {
  const mixed = [
    { id: "a", status: "PASS", reason: null },
    { id: "b", status: "BLOCKED", reason: "PRECONDITION_UNSATISFIED" }
  ];
  const result = aggregate(mixed);
  check(result.executionStatus === "BLOCKED", "expected BLOCKED overall");
  check(result.blockedReason === "PRECONDITION_UNSATISFIED", "expected PRECONDITION_UNSATISFIED reason");
});

// --- 5. evidence hash/content drift -> FAIL ---
test("READ_JSON_FIELD_EQUALS returns FAIL on value drift", () => {
  const root = makeFixtureRoot();
  writeOracleCounts(root, 1234); // drifted value, expected 3720
  const item = {
    id: "decisionClosure",
    checkMethod: "READ_JSON_FIELD_EQUALS",
    evidenceSource: "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_COUNTS.json",
    evidenceField: "total",
    expectedValue: 3720
  };
  const result = evaluateItem(item, root);
  check(result.status === "FAIL", "expected FAIL on drift");
  check(result.reason === "EVIDENCE_HASH_OR_CONTENT_DRIFT", "expected drift reason");
  rmSync(root, { recursive: true, force: true });
});

test("READ_MANIFEST_AND_VERDICT returns FAIL when verdict text does not match", () => {
  const root = makeFixtureRoot();
  writeE2Evidence(root, "SOMETHING_ELSE");
  const item = {
    id: "e2",
    checkMethod: "READ_MANIFEST_AND_VERDICT",
    evidenceSource:
      "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3/E2_EVIDENCE_MANIFEST.sha256",
    internalReviewSource:
      "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3_INTERNAL_REVIEW.md",
    expectedVerdict: "ACCEPTED_FOR_E2_PUBLICATION"
  };
  const result = evaluateItem(item, root);
  check(result.status === "FAIL", "expected FAIL on verdict mismatch");
  rmSync(root, { recursive: true, force: true });
});

// --- 6. prohibited path mutation detection ---
test("assertWritePathAllowed rejects writes outside the allowlisted output directory", () => {
  check(
    (() => {
      try {
        assertWritePathAllowed(path.resolve(process.cwd(), "knowledge"));
        return false;
      } catch {
        return true;
      }
    })(),
    "expected rejection for a write under knowledge/"
  );
});

test("assertWritePathAllowed rejects writes into the unrelated 10A14-R20 evidence tree", () => {
  check(
    (() => {
      try {
        assertWritePathAllowed(path.resolve(process.cwd(), "evaluation/results/phase-10a14-r20/some-dir"));
        return false;
      } catch {
        return true;
      }
    })(),
    "expected rejection for a write under evaluation/results/phase-10a14-r20"
  );
});

test("assertWritePathAllowed accepts the allowlisted output directory", () => {
  assertWritePathAllowed(path.resolve(process.cwd(), "evaluation/results/phase-10a-a15-closure-gate/tmp-test"));
  check(true, "no exception expected");
});

// --- 7. B2-B6 remain out of scope ---
test("contract declares B2-B6 out of scope and never evaluated/modified", () => {
  const contract = loadContract();
  check(contract.b2ThroughB6.evaluatedByA15 === false, "B2-B6 must never be evaluated");
  check(contract.b2ThroughB6.modifiedByA15 === false, "B2-B6 must never be modified");
});

// --- 8. no network behavior ---
test("runner source contains no network-capable imports or calls", () => {
  const source = readFileSync(RUNNER_SOURCE_PATH, "utf8");
  const forbidden = ["node:http", "node:https", "node:net", "node:dgram", "node:dns", "fetch(", "XMLHttpRequest"];
  for (const token of forbidden) {
    check(!source.includes(token), `runner source must not reference ${token}`);
  }
});

// --- 9. A15 PASS does not claim Phase 10A closed ---
test("evaluate() output always disclaims Phase 10A closure and Phase 10B authorization", () => {
  const root = makeFixtureRoot();
  writeSatisfiedCurrentState(root);
  writeOracleCounts(root, 3720);
  writeE2Evidence(root, "ACCEPTED_FOR_E2_PUBLICATION");
  const result = evaluate(root);
  check(result.phase10AClosure === "NOT_CLAIMED", "must not claim Phase 10A closure");
  check(result.phase10BAuthorization === "NOT_CLAIMED", "must not claim Phase 10B authorization");
  check(result.reviewDisposition === "PENDING_INTERNAL_REVIEW", "runner must never self-assign ACCEPTED_FOR_A15_CLOSURE");
  rmSync(root, { recursive: true, force: true });
});

test("full-repo evaluate() today is not PASS, by design (undefined/unsatisfied roadmap items)", () => {
  // Uses the same fixture pattern as a real repo would present today: even
  // with every checkable item satisfied, the statically-known gaps
  // (standalone/integrated exact gates, frozen runtime, post-freeze
  // evidence: NO_EXECUTABLE_DEFINITION_FOUND; reason closure: evidenced
  // NOT satisfied) must still surface as BLOCKED/FAIL, never silently PASS.
  const root = makeFixtureRoot();
  writeSatisfiedCurrentState(root);
  writeOracleCounts(root, 3720);
  writeE2Evidence(root, "ACCEPTED_FOR_E2_PUBLICATION");
  const result = evaluate(root);
  check(result.executionStatus !== "PASS", "must not PASS while undefined/unsatisfied items remain");
  const reasonItem = result.itemResults.find((r) => r.id === "reasonClosure");
  check(reasonItem.status === "FAIL", "reasonClosure must surface as FAIL, not silently pass");
  const frozenRuntimeItem = result.itemResults.find((r) => r.id === "frozenRuntime");
  check(frozenRuntimeItem.status === "BLOCKED", "frozenRuntime must surface as BLOCKED, not silently pass");
  rmSync(root, { recursive: true, force: true });
});

// --- 10. invalid/ambiguous status handling ---
test("evaluateItem throws on an unknown checkMethod rather than guessing a status", () => {
  const root = makeFixtureRoot();
  check(
    (() => {
      try {
        evaluateItem({ id: "bogus", checkMethod: "NOT_A_REAL_METHOD" }, root);
        return false;
      } catch {
        return true;
      }
    })(),
    "expected evaluateItem to throw on an unrecognized checkMethod"
  );
  rmSync(root, { recursive: true, force: true });
});

// --- 11. deterministic rerun behavior ---
test("evaluate() is byte-identical across repeated runs against the same fixture root", () => {
  const root = makeFixtureRoot();
  writeSatisfiedCurrentState(root);
  writeOracleCounts(root, 3720);
  writeE2Evidence(root, "ACCEPTED_FOR_E2_PUBLICATION");
  const first = JSON.stringify(evaluate(root));
  const second = JSON.stringify(evaluate(root));
  const third = JSON.stringify(evaluate(root));
  check(first === second && second === third, "evaluate() must be deterministic across reruns");
  rmSync(root, { recursive: true, force: true });
});

console.log(`\nPHASE-10A-A15-FINAL-CLOSURE-GATE-V1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
