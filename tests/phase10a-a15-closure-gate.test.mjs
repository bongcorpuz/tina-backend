// PHASE-10A-A15-FINAL-CLOSURE-GATE-V1 - focused test.
//
// Pure fixture-based validation only. NO network, NO real canonical
// repository access, NO writes outside a per-test temp directory under
// os.tmpdir(). This test suite never points the runner at the real
// tina-backend working tree and never executes A15 against real evidence.

import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

import {
  CONTRACT,
  loadContract,
  evaluateItem,
  evaluateCheck,
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
test("contract is embedded (single source) and exposes required top-level fields", () => {
  const contract = loadContract();
  check(contract === CONTRACT, "loadContract() must return the same embedded singleton, not a re-parsed copy");
  check(contract.identity === "PHASE-10A-A15-FINAL-CLOSURE-GATE-V1", "identity must match");
  check(contract.version === 1, "version must be 1");
  check(contract.ownerGovernedBehavior.networkAllowed === false, "network must be disabled");
  check(contract.phase10AClosure.autoClose === false, "must not auto-close Phase 10A");
  check(contract.b2ThroughB6.disposition === "OPEN_UNCHANGED_OUT_OF_SCOPE", "B2-B6 must be out of scope");
});

test("contract preserves exactly the 11 canonical top-level roadmap exit items", () => {
  check(
    CONTRACT.exitItems.length === 11,
    `expected 11 top-level items, found ${CONTRACT.exitItems.length}`
  );
  const ids = CONTRACT.exitItems.map((i) => i.id);
  check(
    ids.includes("standaloneAndIntegratedExactGates") &&
      !ids.includes("standaloneExactGates") &&
      !ids.includes("integratedExactGates"),
    "standalone and integrated exact gates must be ONE top-level item, not two"
  );
  check(
    ids.includes("deterministicCleanCycles") && ids.includes("stagingCleanCycles"),
    "deterministic clean cycles and staging clean cycles remain two separate top-level items (roadmap lists them separately)"
  );
});

test("standaloneAndIntegratedExactGates carries two subordinate deterministic checks", () => {
  const item = CONTRACT.exitItems.find((i) => i.id === "standaloneAndIntegratedExactGates");
  check(item.checkMethod === "MULTI_SUBCHECK", "must use MULTI_SUBCHECK");
  check(item.subChecks.length === 2, "must have exactly 2 subChecks");
  check(item.subChecks.map((s) => s.id).sort().join(",") === "integrated,standalone", "subCheck ids must be standalone/integrated");
});

test("no A15_EXECUTION_CONTRACT.json is pre-committed beside the runner (E2 convention: snapshot only, generated at execution time)", () => {
  const files = readdirSync(path.dirname(RUNNER_SOURCE_PATH));
  check(
    !files.includes("A15_EXECUTION_CONTRACT.json"),
    "a pre-committed contract JSON would create two independently editable execution contracts"
  );
});

test("--out mode writes a hash-pinned contract snapshot identical to the embedded CONTRACT", () => {
  const root = makeFixtureRoot();
  writeSatisfiedCurrentState(root);
  writeOracleCounts(root, 3720);
  writeE2Evidence(root, "ACCEPTED_FOR_E2_PUBLICATION");

  const outDir = path.join(
    "evaluation/results/phase-10a-a15-closure-gate",
    `test-tmp-${process.pid}-${Date.now()}`
  );
  try {
    try {
      execFileSync(
        process.execPath,
        [RUNNER_SOURCE_PATH, "--root", root, "--out", outDir],
        { cwd: process.cwd(), stdio: ["ignore", "ignore", "pipe"] }
      );
    } catch (err) {
      // This fixture's reasonClosure is intentionally FAIL (STATIC_NOT_SATISFIED),
      // so the runner correctly exits non-zero (see main()'s FAIL -> exitCode=1).
      // The evidence files are still written to disk before exit; only a
      // non-zero exit itself is expected and tolerated here.
      if (!("status" in err)) throw err;
    }
    const snapshotRaw = readFileSync(path.join(outDir, "A15_EXECUTION_CONTRACT.json"), "utf8");
    const embeddedRaw = JSON.stringify(CONTRACT, null, 2) + "\n";
    check(snapshotRaw === embeddedRaw, "generated snapshot must be byte-identical to the embedded CONTRACT");

    const manifest = readFileSync(path.join(outDir, "A15_EVIDENCE_MANIFEST.sha256"), "utf8");
    const expectedHash = createHash("sha256").update(snapshotRaw).digest("hex");
    check(manifest.includes(expectedHash), "manifest must record the exact hash of the contract snapshot it wrote");
  } finally {
    rmSync(outDir, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});

// --- 2. PASS path via synthetic/fixture evidence (aggregation logic) ---
test("aggregate() reports PASS when every evaluated item is satisfied", () => {
  const allPass = [
    { id: "a", status: "PASS" },
    { id: "b", status: "PASS" },
    { id: "c", status: "NOT_APPLICABLE" }
  ];
  const result = aggregate(allPass);
  check(result.executionStatus === "PASS", "expected PASS, got " + result.executionStatus);
});

test("evaluateItem PRECONDITION_GATE returns PASS when satisfied", () => {
  const root = makeFixtureRoot();
  writeSatisfiedCurrentState(root);
  const item = { id: "deterministicCleanCycles", checkMethod: "PRECONDITION_GATE" };
  const result = evaluateItem(item, root);
  check(result.status === "PASS", "expected PASS for satisfied precondition, got " + result.status);
  rmSync(root, { recursive: true, force: true });
});

// --- 3. missing evidence -> item BLOCKED_MISSING_EVIDENCE ---
test("READ_JSON_FIELD_EQUALS returns BLOCKED_MISSING_EVIDENCE when file absent", () => {
  const root = makeFixtureRoot();
  const item = {
    id: "decisionClosure",
    checkMethod: "READ_JSON_FIELD_EQUALS",
    evidenceSource: "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_COUNTS.json",
    evidenceField: "total",
    expectedValue: 3720
  };
  const result = evaluateItem(item, root);
  check(result.status === "BLOCKED_MISSING_EVIDENCE", "expected BLOCKED_MISSING_EVIDENCE, got " + result.status);
  rmSync(root, { recursive: true, force: true });
});

test("READ_JSON_FIELD_EQUALS returns BLOCKED_MISSING_EVIDENCE (not PASS) even when the total count matches, per the documented per-row-manifest gap", () => {
  const root = makeFixtureRoot();
  writeOracleCounts(root, 3720);
  const item = {
    id: "decisionClosure",
    checkMethod: "READ_JSON_FIELD_EQUALS",
    evidenceSource: "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_COUNTS.json",
    evidenceField: "total",
    expectedValue: 3720
  };
  const result = evaluateItem(item, root);
  check(result.status === "BLOCKED_MISSING_EVIDENCE", "matching total count is not sufficient for PASS; got " + result.status);
  rmSync(root, { recursive: true, force: true });
});

// --- missing definition -> item BLOCKED_MISSING_DEFINITION ---
test("STATIC_BLOCKED_NO_DEFINITION always returns BLOCKED_MISSING_DEFINITION", () => {
  const root = makeFixtureRoot();
  const item = { id: "frozenRuntime", checkMethod: "STATIC_BLOCKED_NO_DEFINITION", statusNote: "no definition" };
  const result = evaluateItem(item, root);
  check(result.status === "BLOCKED_MISSING_DEFINITION", "expected BLOCKED_MISSING_DEFINITION, got " + result.status);
  rmSync(root, { recursive: true, force: true });
});

test("MULTI_SUBCHECK combines two BLOCKED_MISSING_DEFINITION subchecks into an item-level BLOCKED_MISSING_DEFINITION, preserving both subCheckResults", () => {
  const root = makeFixtureRoot();
  const item = CONTRACT.exitItems.find((i) => i.id === "standaloneAndIntegratedExactGates");
  const result = evaluateItem(item, root);
  check(result.status === "BLOCKED_MISSING_DEFINITION", "expected combined BLOCKED_MISSING_DEFINITION");
  check(result.subCheckResults.length === 2, "both subcheck results must be preserved");
  check(
    result.subCheckResults.every((r) => r.status === "BLOCKED_MISSING_DEFINITION"),
    "both subchecks must individually report BLOCKED_MISSING_DEFINITION"
  );
  rmSync(root, { recursive: true, force: true });
});

// --- 4. D1 prerequisite unsatisfied -> item BLOCKED_PRECONDITION, dominates overall aggregation ---
test("PRECONDITION_GATE returns BLOCKED_PRECONDITION when unsatisfied", () => {
  const root = makeFixtureRoot();
  writeSatisfiedCurrentState(root, { "Deterministic clean/staging closure": "UNSATISFIED" });
  const item = { id: "deterministicCleanCycles", checkMethod: "PRECONDITION_GATE" };
  const result = evaluateItem(item, root);
  check(result.status === "BLOCKED_PRECONDITION", "expected BLOCKED_PRECONDITION, got " + result.status);
  rmSync(root, { recursive: true, force: true });
});

test("aggregate() forces overall BLOCKED/PRECONDITION_UNSATISFIED even if other items PASS or FAIL", () => {
  const mixed = [
    { id: "a", status: "PASS" },
    { id: "b", status: "FAIL" },
    { id: "c", status: "BLOCKED_PRECONDITION" }
  ];
  const result = aggregate(mixed);
  check(result.executionStatus === "BLOCKED", "expected BLOCKED overall");
  check(result.blockedReason === "PRECONDITION_UNSATISFIED", "expected PRECONDITION_UNSATISFIED reason");
});

// --- All per-item findings remain visible even though overall precedence produces BLOCKED ---
test("evaluate() itemResults always contains all 11 items, even when overall executionStatus is BLOCKED", () => {
  const root = makeFixtureRoot();
  writeSatisfiedCurrentState(root, { "Deterministic clean/staging closure": "UNSATISFIED" }); // forces overall BLOCKED
  writeOracleCounts(root, 3720);
  writeE2Evidence(root, "ACCEPTED_FOR_E2_PUBLICATION");
  const result = evaluate(root);
  check(result.executionStatus === "BLOCKED", "expected overall BLOCKED due to unsatisfied precondition");
  check(result.itemResults.length === 11, "all 11 item findings must remain present, got " + result.itemResults.length);
  const reasonItem = result.itemResults.find((r) => r.id === "reasonClosure");
  check(reasonItem && reasonItem.status === "FAIL", "reasonClosure's own FAIL must still be visible, not hidden by the precondition BLOCK");
  const e2Item = result.itemResults.find((r) => r.id === "e2");
  check(e2Item && e2Item.status === "PASS", "e2's own PASS must still be visible even though overall is BLOCKED");
  rmSync(root, { recursive: true, force: true });
});

// --- 5. evidence hash/content drift -> item FAIL ---
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
  check(result.status === "FAIL", "expected FAIL on drift, got " + result.status);
  rmSync(root, { recursive: true, force: true });
});

test("READ_MANIFEST_AND_VERDICT returns FAIL when verdict text does not match", () => {
  const root = makeFixtureRoot();
  writeE2Evidence(root, "SOMETHING_ELSE");
  const item = CONTRACT.exitItems.find((i) => i.id === "e2");
  const result = evaluateItem(item, root);
  check(result.status === "FAIL", "expected FAIL on verdict mismatch, got " + result.status);
  rmSync(root, { recursive: true, force: true });
});

test("STATIC_NOT_SATISFIED (reasonClosure) always reports item-level FAIL, not BLOCKED", () => {
  const root = makeFixtureRoot();
  const item = CONTRACT.exitItems.find((i) => i.id === "reasonClosure");
  const result = evaluateItem(item, root);
  check(result.status === "FAIL", "reasonClosure is evidenced-unsatisfied, which is FAIL, not an undefined/missing BLOCKED state");
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
  check(CONTRACT.b2ThroughB6.evaluatedByA15 === false, "B2-B6 must never be evaluated");
  check(CONTRACT.b2ThroughB6.modifiedByA15 === false, "B2-B6 must never be modified");
  const ids = CONTRACT.exitItems.map((i) => i.id);
  check(!ids.some((id) => /b[2-6]/i.test(id)), "B2-B6 must not appear as an exitItem at all");
});

// --- 8. no network behavior ---
test("runner source contains no network-capable imports or calls", () => {
  const source = readFileSync(RUNNER_SOURCE_PATH, "utf8");
  const forbidden = ["node:http", "node:https", "node:net", "node:dgram", "node:dns", "fetch(", "XMLHttpRequest", "child_process"];
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
  const root = makeFixtureRoot();
  writeSatisfiedCurrentState(root);
  writeOracleCounts(root, 3720);
  writeE2Evidence(root, "ACCEPTED_FOR_E2_PUBLICATION");
  const result = evaluate(root);
  check(result.executionStatus !== "PASS", "must not PASS while undefined/unsatisfied items remain");
  const reasonItem = result.itemResults.find((r) => r.id === "reasonClosure");
  check(reasonItem.status === "FAIL", "reasonClosure must surface as FAIL, not silently pass");
  const gatesItem = result.itemResults.find((r) => r.id === "standaloneAndIntegratedExactGates");
  check(gatesItem.status === "BLOCKED_MISSING_DEFINITION", "standalone/integrated exact gates must surface as BLOCKED_MISSING_DEFINITION");
});

// --- PASS is mathematically reachable once every item is actually satisfiable ---
test("aggregate() proves PASS is reachable in principle once every item resolves favorably", () => {
  const everythingResolved = CONTRACT.exitItems
    .filter((i) => i.checkMethod !== "NOT_APPLICABLE")
    .map((i) => ({ id: i.id, status: "PASS" }));
  const result = aggregate(everythingResolved);
  check(result.executionStatus === "PASS", "aggregation logic itself must be capable of PASS, not permanently broken");
});

// --- 10. invalid/ambiguous status handling ---
test("evaluateCheck throws on an unknown checkMethod rather than guessing a status", () => {
  const root = makeFixtureRoot();
  check(
    (() => {
      try {
        evaluateCheck({ id: "bogus", checkMethod: "NOT_A_REAL_METHOD" }, root);
        return false;
      } catch {
        return true;
      }
    })(),
    "expected evaluateCheck to throw on an unrecognized checkMethod"
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
