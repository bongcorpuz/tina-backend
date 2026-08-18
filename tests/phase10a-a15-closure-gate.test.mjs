// PHASE-10A-A15-FINAL-CLOSURE-GATE-V1 - focused test.
//
// Pure fixture-based validation only. NO network, NO real canonical
// repository access, NO writes outside a per-test temp directory under
// os.tmpdir(). This test suite never points the runner at the real
// tina-backend working tree and never executes A15 against real evidence.
//
// All fixture roots are created and torn down through withFixtureRoot(), whose
// try/finally guarantees cleanup even when an assertion throws (F6).

import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
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
  isContained,
  computePassReachability,
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

// F6: every fixture root is torn down in a finally block, so a failing
// assertion cannot leak a temp directory.
function withFixtureRoot(fn) {
  const root = mkdtempSync(path.join(tmpdir(), "a15-fixture-"));
  mkdirSync(path.join(root, "knowledge"), { recursive: true });
  mkdirSync(path.join(root, "evaluation/oracles/phase-10a14-r20"), { recursive: true });
  mkdirSync(
    path.join(root, "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3"),
    { recursive: true }
  );
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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

function fullySatisfiedFixture(root) {
  writeSatisfiedCurrentState(root);
  writeOracleCounts(root, 3720);
  writeE2Evidence(root, "ACCEPTED_FOR_E2_PUBLICATION");
}

// ─── 1. Contract identity and shape ──────────────────────────────────────────

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
  check(CONTRACT.exitItems.length === 11, `expected 11 top-level items, found ${CONTRACT.exitItems.length}`);
  const ids = CONTRACT.exitItems.map((i) => i.id);
  check(
    ids.includes("standaloneAndIntegratedExactGates") &&
      !ids.includes("standaloneExactGates") &&
      !ids.includes("integratedExactGates"),
    "standalone and integrated exact gates must be ONE top-level item, not two"
  );
  check(
    ids.includes("deterministicCleanCycles") && ids.includes("stagingCleanCycles"),
    "deterministic and staging clean cycles remain two separate top-level items"
  );
});

test("standaloneAndIntegratedExactGates carries two subordinate deterministic checks", () => {
  const item = CONTRACT.exitItems.find((i) => i.id === "standaloneAndIntegratedExactGates");
  check(item.checkMethod === "MULTI_SUBCHECK", "must use MULTI_SUBCHECK");
  check(item.subChecks.length === 2, "must have exactly 2 subChecks");
  check(item.subChecks.map((s) => s.id).sort().join(",") === "integrated,standalone", "subCheck ids must be standalone/integrated");
});

test("no A15_EXECUTION_CONTRACT.json is pre-committed beside the runner (E2 convention: snapshot only)", () => {
  const files = readdirSync(path.dirname(RUNNER_SOURCE_PATH));
  check(!files.includes("A15_EXECUTION_CONTRACT.json"), "a pre-committed contract JSON would create two independently editable contracts");
});

// ─── 2. F1: PASS reachability truthfulness ───────────────────────────────────

test("F1: contract truthfully declares PASS is NOT currently reachable end-to-end", () => {
  const pr = CONTRACT.passReachability;
  check(pr.status === "REQUIRES_FUTURE_CONTRACT_REVISION", "status must be REQUIRES_FUTURE_CONTRACT_REVISION");
  check(pr.aggregationLogicCanRepresentPass === true, "aggregation logic can represent PASS");
  check(pr.currentCheckCatalogueCanProducePass === false, "current catalogue must NOT claim PASS capability");
  check(pr.itemsThatCannotCurrentlyProducePass.length === 6, "exactly 6 items cannot currently produce PASS");
});

test("F1: declared pass-reachability matches what the live check catalogue actually supports (drift guard)", () => {
  const derived = computePassReachability();
  const declared = CONTRACT.passReachability;
  check(
    derived.currentCheckCatalogueCanProducePass === declared.currentCheckCatalogueCanProducePass,
    "declared catalogue PASS-capability must match derived"
  );
  check(
    derived.itemsThatCannotCurrentlyProducePass.slice().sort().join(",") ===
      declared.itemsThatCannotCurrentlyProducePass.slice().sort().join(","),
    `derived [${derived.itemsThatCannotCurrentlyProducePass}] must equal declared [${declared.itemsThatCannotCurrentlyProducePass}]`
  );
});

test("F1: even with maximally favourable evidence, the real catalogue cannot reach end-to-end PASS", () => {
  withFixtureRoot((root) => {
    fullySatisfiedFixture(root);
    const result = evaluate(root);
    check(result.executionStatus !== "PASS", "V1 must not be able to reach PASS end-to-end");
    check(result.passReachability === "REQUIRES_FUTURE_CONTRACT_REVISION", "result must carry the reachability disposition");
  });
});

test("F1: READ_JSON_FIELD_EQUALS has no PASS branch even on an exact evidence match", () => {
  withFixtureRoot((root) => {
    writeOracleCounts(root, 3720); // exactly the expected value
    const item = CONTRACT.exitItems.find((i) => i.id === "decisionClosure");
    const result = evaluateItem(item, root);
    check(result.status === "BLOCKED_MISSING_EVIDENCE", `exact match must still block (no per-row manifest); got ${result.status}`);
  });
});

test("F1: aggregation logic alone CAN represent PASS (this proves the aggregator only, not the gate)", () => {
  const synthetic = [
    { id: "a", status: "PASS" },
    { id: "b", status: "PASS" },
    { id: "c", status: "NOT_APPLICABLE" }
  ];
  check(aggregate(synthetic).executionStatus === "PASS", "aggregator must be capable of PASS given all-PASS inputs");
});

// ─── 3. F2/F4: write-boundary security ───────────────────────────────────────

const CWD = process.cwd();
const ALLOWED = "evaluation/results/phase-10a-a15-closure-gate";

function writeAllowed(relOrAbs) {
  try {
    assertWritePathAllowed(path.resolve(CWD, relOrAbs), CWD);
    return true;
  } catch {
    return false;
  }
}

test("F2/F4: exact allowlisted output directory is accepted", () => {
  check(writeAllowed(ALLOWED), "the exact governed directory must be writable");
});

test("F2/F4: descendants of the allowlisted directory are accepted", () => {
  check(writeAllowed(`${ALLOWED}/run-1`), "descendant directory must be writable");
  check(writeAllowed(`${ALLOWED}/run-1/nested`), "nested descendant must be writable");
});

test("F2/F4: textual-prefix sibling 'phase-10a-a15-closure-gate-EVIL' is REJECTED", () => {
  check(!writeAllowed(`${ALLOWED}-EVIL`), "a sibling sharing the text prefix must be rejected");
});

test("F2/F4: unrelated sibling directories are rejected", () => {
  check(!writeAllowed("evaluation/results/phase-10a14-r20"), "historical evidence tree must be rejected");
  check(!writeAllowed("evaluation/results/other"), "unrelated sibling must be rejected");
});

test("F2/F4: parent traversal out of the allowlisted directory is rejected", () => {
  check(!writeAllowed(`${ALLOWED}/../../../knowledge`), "traversal escape must be rejected");
  check(!writeAllowed(`${ALLOWED}/..`), "parent of allowed dir must be rejected");
});

test("F2/F4: normalized path aliases resolving back inside are accepted", () => {
  check(writeAllowed(`${ALLOWED}/x/../y`), "alias resolving to a descendant must be accepted");
});

test("F2/F4: absolute paths outside the repository are rejected", () => {
  check(!writeAllowed(path.resolve(tmpdir(), "a15-escape")), "absolute outside path must be rejected");
});

test("F2/F4: protected governance and runtime locations are rejected by the real mechanism (containment)", () => {
  for (const p of ["knowledge", "knowledge/CURRENT_STATE.md", "server.js", "security/public-health.js", "evaluation/runner/phase-10a14-r20"]) {
    check(!writeAllowed(p), `${p} must be rejected`);
  }
});

// ─── 4. F5: read-boundary security ───────────────────────────────────────────

test("F5: a textual sibling of the repository root is NOT considered inside it", () => {
  check(
    isContained("C:/Projects/tina-backend", "C:/Projects/tina-backend/knowledge/x.md") === true,
    "true descendant must be contained"
  );
  check(
    isContained("C:/Projects/tina-backend", "C:/Projects/tina-backend-a15-v1/knowledge/x.md") === false,
    "textual sibling of root must NOT be contained"
  );
});

test("F5: base itself is contained; parent and traversal are not", () => {
  check(isContained("/a/b", "/a/b") === true, "base itself is contained");
  check(isContained("/a/b", "/a") === false, "parent is not contained");
  check(isContained("/a/b", "/a/c") === false, "sibling is not contained");
});

// ─── 5. Symlink handling ─────────────────────────────────────────────────────

test("symlink escape out of a governed root is rejected (skips if unprivileged)", () => {
  withFixtureRoot((base) => {
    const root = path.join(base, "sym-root");
    const outside = path.join(base, "sym-outside");
    mkdirSync(root, { recursive: true });
    mkdirSync(outside, { recursive: true });
    writeFileSync(path.join(outside, "secret.txt"), "escaped");
    const link = path.join(root, "link");
    let linked = true;
    try {
      symlinkSync(outside, link, "junction");
    } catch {
      try {
        symlinkSync(outside, link, "dir");
      } catch {
        linked = false;
      }
    }
    if (!linked) {
      check(true, "symlink creation unavailable in this environment; escape case not exercised");
      return;
    }
    check(isContained(root, path.join(link, "secret.txt")) === false, "symlinked escape must be rejected");
  });
});

// ─── 6. Item semantics ───────────────────────────────────────────────────────

test("PRECONDITION_GATE returns PASS when the gate row is SATISFIED", () => {
  withFixtureRoot((root) => {
    writeSatisfiedCurrentState(root);
    const result = evaluateItem({ id: "deterministicCleanCycles", checkMethod: "PRECONDITION_GATE" }, root);
    check(result.status === "PASS", `expected PASS, got ${result.status}`);
  });
});

test("PRECONDITION_GATE returns BLOCKED_PRECONDITION when unsatisfied", () => {
  withFixtureRoot((root) => {
    writeSatisfiedCurrentState(root, { "Deterministic clean/staging closure": "UNSATISFIED" });
    const result = evaluateItem({ id: "deterministicCleanCycles", checkMethod: "PRECONDITION_GATE" }, root);
    check(result.status === "BLOCKED_PRECONDITION", `expected BLOCKED_PRECONDITION, got ${result.status}`);
  });
});

test("READ_JSON_FIELD_EQUALS returns BLOCKED_MISSING_EVIDENCE when the file is absent", () => {
  withFixtureRoot((root) => {
    const item = CONTRACT.exitItems.find((i) => i.id === "decisionClosure");
    check(evaluateItem(item, root).status === "BLOCKED_MISSING_EVIDENCE", "absent evidence must block");
  });
});

test("READ_JSON_FIELD_EQUALS returns FAIL on value drift", () => {
  withFixtureRoot((root) => {
    writeOracleCounts(root, 1234);
    const item = CONTRACT.exitItems.find((i) => i.id === "decisionClosure");
    check(evaluateItem(item, root).status === "FAIL", "drifted evidence must FAIL");
  });
});

test("STATIC_BLOCKED_NO_DEFINITION always returns BLOCKED_MISSING_DEFINITION", () => {
  withFixtureRoot((root) => {
    const item = CONTRACT.exitItems.find((i) => i.id === "frozenRuntime");
    check(evaluateItem(item, root).status === "BLOCKED_MISSING_DEFINITION", "undefined criteria must block");
  });
});

test("MULTI_SUBCHECK combines subchecks and preserves both subCheckResults", () => {
  withFixtureRoot((root) => {
    const item = CONTRACT.exitItems.find((i) => i.id === "standaloneAndIntegratedExactGates");
    const result = evaluateItem(item, root);
    check(result.status === "BLOCKED_MISSING_DEFINITION", "combined status must be BLOCKED_MISSING_DEFINITION");
    check(result.subCheckResults.length === 2, "both subcheck results preserved");
    check(result.subCheckResults.every((r) => r.status === "BLOCKED_MISSING_DEFINITION"), "each subcheck blocks");
  });
});

test("STATIC_NOT_SATISFIED (reasonClosure) reports FAIL, not BLOCKED", () => {
  withFixtureRoot((root) => {
    const item = CONTRACT.exitItems.find((i) => i.id === "reasonClosure");
    check(evaluateItem(item, root).status === "FAIL", "evidenced-unsatisfied is FAIL, not missing/undefined");
  });
});

test("READ_MANIFEST_AND_VERDICT returns FAIL when the verdict does not match", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, "SOMETHING_ELSE");
    const item = CONTRACT.exitItems.find((i) => i.id === "e2");
    check(evaluateItem(item, root).status === "FAIL", "verdict mismatch must FAIL");
  });
});

test("evaluateCheck throws on an unknown checkMethod rather than guessing a status", () => {
  withFixtureRoot((root) => {
    let threw = false;
    try {
      evaluateCheck({ id: "bogus", checkMethod: "NOT_A_REAL_METHOD" }, root);
    } catch {
      threw = true;
    }
    check(threw, "unknown checkMethod must throw");
  });
});

// ─── 7. Aggregation and visibility ───────────────────────────────────────────

test("aggregate() forces overall BLOCKED/PRECONDITION_UNSATISFIED even if other items PASS or FAIL", () => {
  const mixed = [
    { id: "a", status: "PASS" },
    { id: "b", status: "FAIL" },
    { id: "c", status: "BLOCKED_PRECONDITION" }
  ];
  const result = aggregate(mixed);
  check(result.executionStatus === "BLOCKED", "expected overall BLOCKED");
  check(result.blockedReason === "PRECONDITION_UNSATISFIED", "expected PRECONDITION_UNSATISFIED");
});

test("all 11 item findings remain visible even when overall executionStatus is BLOCKED", () => {
  withFixtureRoot((root) => {
    writeSatisfiedCurrentState(root, { "Deterministic clean/staging closure": "UNSATISFIED" });
    writeOracleCounts(root, 3720);
    writeE2Evidence(root, "ACCEPTED_FOR_E2_PUBLICATION");
    const result = evaluate(root);
    check(result.executionStatus === "BLOCKED", "overall must be BLOCKED");
    check(result.itemResults.length === 11, `all 11 findings must remain, got ${result.itemResults.length}`);
    check(result.itemResults.find((r) => r.id === "reasonClosure").status === "FAIL", "reasonClosure FAIL still visible");
    check(result.itemResults.find((r) => r.id === "e2").status === "PASS", "e2 PASS still visible");
  });
});

test("evaluate() disclaims Phase 10A closure and Phase 10B authorization", () => {
  withFixtureRoot((root) => {
    fullySatisfiedFixture(root);
    const result = evaluate(root);
    check(result.phase10AClosure === "NOT_CLAIMED", "must not claim Phase 10A closure");
    check(result.phase10BAuthorization === "NOT_CLAIMED", "must not claim Phase 10B authorization");
    check(result.reviewDisposition === "PENDING_INTERNAL_REVIEW", "runner must never self-assign ACCEPTED_FOR_A15_CLOSURE");
  });
});

test("evaluate() is byte-identical across repeated runs against the same fixture root", () => {
  withFixtureRoot((root) => {
    fullySatisfiedFixture(root);
    const a = JSON.stringify(evaluate(root));
    const b = JSON.stringify(evaluate(root));
    const c = JSON.stringify(evaluate(root));
    check(a === b && b === c, "evaluate() must be deterministic");
  });
});

// ─── 8. B2-B6 and network posture ────────────────────────────────────────────

test("contract declares B2-B6 out of scope and never evaluated/modified", () => {
  check(CONTRACT.b2ThroughB6.evaluatedByA15 === false, "B2-B6 must never be evaluated");
  check(CONTRACT.b2ThroughB6.modifiedByA15 === false, "B2-B6 must never be modified");
  check(!CONTRACT.exitItems.some((i) => /b[2-6]/i.test(i.id)), "B2-B6 must not appear as an exitItem");
});

test("runner source contains no network-capable imports or calls", () => {
  const source = readFileSync(RUNNER_SOURCE_PATH, "utf8");
  for (const token of ["node:http", "node:https", "node:net", "node:dgram", "node:dns", "fetch(", "XMLHttpRequest", "child_process"]) {
    check(!source.includes(token), `runner source must not reference ${token}`);
  }
});

test("runner no longer carries unreachable prohibited-write patterns (F3)", () => {
  const source = readFileSync(RUNNER_SOURCE_PATH, "utf8");
  check(!source.includes("PROHIBITED_WRITE_PATTERNS ="), "the dead prohibited-pattern list must be gone");
});

// ─── 9. Execution-time contract snapshot ─────────────────────────────────────

test("--out mode writes a hash-pinned contract snapshot identical to the embedded CONTRACT", () => {
  withFixtureRoot((root) => {
    fullySatisfiedFixture(root);
    const outDir = path.join(ALLOWED, `test-tmp-${process.pid}-${Date.now()}`);
    try {
      try {
        execFileSync(process.execPath, [RUNNER_SOURCE_PATH, "--root", root, "--out", outDir], {
          cwd: process.cwd(),
          stdio: ["ignore", "ignore", "pipe"]
        });
      } catch (err) {
        // reasonClosure is intentionally FAIL, so a non-zero exit is expected.
        if (!("status" in err)) throw err;
      }
      const snapshotRaw = readFileSync(path.join(outDir, "A15_EXECUTION_CONTRACT.json"), "utf8");
      check(snapshotRaw === JSON.stringify(CONTRACT, null, 2) + "\n", "snapshot must be byte-identical to embedded CONTRACT");
      const manifest = readFileSync(path.join(outDir, "A15_EVIDENCE_MANIFEST.sha256"), "utf8");
      check(manifest.includes(createHash("sha256").update(snapshotRaw).digest("hex")), "manifest must hash-pin the snapshot");
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

console.log(`\nPHASE-10A-A15-FINAL-CLOSURE-GATE-V1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
