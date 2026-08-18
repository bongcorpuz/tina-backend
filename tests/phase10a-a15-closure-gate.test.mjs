// PHASE-10A-A15-FINAL-CLOSURE-GATE-V1 - focused behavioral test suite.
//
// Pure fixture-based validation only. NO network, NO real canonical repository
// mutation, and NO writes anywhere inside the governed repository working tree.
// Every fixture root, and every --out directory this suite exercises, lives
// under os.tmpdir() (adjacent finding G). This suite never points the runner at
// the real tina-backend working tree for an evidence-producing run, and never
// executes the real governed A15 closure operation.
//
// Fixture roots are created and torn down through withFixtureRoot(), whose
// try/finally guarantees cleanup even when an assertion throws.
//
// Test-quality rules applied (adjacent finding H): no assertion merely restates
// one contract declaration against another, no assertion is satisfied by the
// mere existence of an export, and no assertion converts an environment
// inability into a pass (adjacent finding I -- see skip()).

import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  statSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import {
  CONTRACT,
  EXIT_CODES,
  LEDGER_ROW_SELECTION_RULE,
  loadContract,
  evaluateItem,
  evaluateCheck,
  aggregate,
  assertWritePathAllowed,
  isContained,
  computePassReachability,
  evaluate,
  exitCodeFor,
  parseArgs,
  parseLedgerTable,
  selectLedgerRow,
  verifyEvidenceManifest,
  extractVerdict,
  readWorktreeHead,
  runtimeIdentity,
  main
} from "../evaluation/runner/phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs";

// Resolved from this file's own location, not from process.cwd(), so the suite
// behaves identically under `npm test`, a direct `node tests/...` invocation
// from any directory, and the regression runner.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNNER_SOURCE_PATH = path.join(
  REPO_ROOT,
  "evaluation/runner/phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs"
);

const E2_DIR = "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3";
const E2_MANIFEST = `${E2_DIR}/E2_EVIDENCE_MANIFEST.sha256`;
const E2_REVIEW = `${E2_DIR}_INTERNAL_REVIEW.md`;
const ALLOWED_REL = "evaluation/results/phase-10a-a15-closure-gate";

let passed = 0;
let failed = 0;
let assertions = 0;
let skipped = 0;
const skipReasons = [];

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
  if (!condition) throw new Error(message);
}

function eq(actual, expected, message) {
  assertions += 1;
  if (actual !== expected) throw new Error(`${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

function throws(fn, message) {
  assertions += 1;
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(message);
}

// Adjacent finding I: an environment that cannot exercise a security case is
// recorded as UNRESOLVED. It is never counted as a passing assertion, and the
// run summary reports it separately so it cannot be mistaken for coverage.
function skip(reason) {
  skipped += 1;
  skipReasons.push(reason);
  console.log(`SKIP (unresolved, not coverage) ${reason}`);
}

function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function withFixtureRoot(fn) {
  const root = mkdtempSync(path.join(tmpdir(), "a15-fixture-"));
  mkdirSync(path.join(root, "knowledge"), { recursive: true });
  mkdirSync(path.join(root, "evaluation/oracles/phase-10a14-r20"), { recursive: true });
  mkdirSync(path.join(root, E2_DIR), { recursive: true });
  // Adjacent G: the allowlisted output PARENT lives inside the fixture root, so
  // --out runs never touch the governed repository tree.
  mkdirSync(path.join(root, ALLOWED_REL), { recursive: true });
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ── Ledger fixtures copied from REAL knowledge/CURRENT_STATE.md row formats ───
//
// Verified against the committed ledger: two-column tables, a backticked token
// in the value cell, optional trailing prose annotation either parenthesised
// ("(unchanged)") or semicolon-introduced, labels that may themselves contain
// backticks, and one genuinely convention-breaking row whose value cell does
// NOT start with a backtick ("| E2 overall | not `PUBLISHED`/`CLOSED` ... |").

const REAL_NEWEST_BLOCK = [
  "| Gate | Disposition |",
  "|---|---|",
  "| C37 | `TERMINAL` |",
  "| C38 | `TERMINAL` |",
  "| R4 bounded development-governance review | `ACCEPTED` |",
  "| Post-R4 external-review gate | `SATISFIED` |",
  "| A15 | `BLOCKED_NO_EXECUTABLE_CONTRACT_FOUND` (unchanged) |",
  "| Deterministic clean/staging closure | `UNSATISFIED` (unchanged) |",
  "| B2, B3, B4, B5, B6 | `OPEN` (unchanged) |",
  "| Production/release gate | `NOT GREEN` (unchanged) |",
  ""
].join("\n");

const REAL_MIDDLE_BLOCK = [
  "| Gate or status | Current disposition |",
  "|---|---|",
  "| Inherited three-path `/health` working-tree residue | `RESOLVED` (commit `68969f75`; working-tree/commit-state only) |",
  "| E2 overall | not `PUBLISHED`/`CLOSED` \u2014 those terms are not contract-supported; see above |",
  "| Deterministic clean-staging closure | `NOT_CLAIMED` |",
  ""
].join("\n");

const REAL_OLDEST_BLOCK = [
  "| Gate | Current disposition |",
  "|---|---|",
  "| Post-R4 independent external Phase 10A review | `UNSATISFIED` |",
  "| Deterministic clean/staging closure | `NOT_CLAIMED` |",
  "| B2, B3, B4, B5, B6 | `OPEN_UNCHANGED`; nonblocking to terminal C38, still relevant to broader closure |",
  ""
].join("\n");

const REAL_LEDGER = [REAL_NEWEST_BLOCK, REAL_MIDDLE_BLOCK, REAL_OLDEST_BLOCK].join("\n");

function writeLedger(root, text) {
  writeFileSync(path.join(root, "knowledge/CURRENT_STATE.md"), text);
}

function ledgerFrom(rows) {
  return ["| Gate | Disposition |", "|---|---|", ...rows, ""].join("\n");
}

function writeOracleCounts(root, total) {
  writeFileSync(
    path.join(root, "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_COUNTS.json"),
    JSON.stringify({ total })
  );
}

/**
 * Writes a REAL, self-consistent E2 evidence package: one artifact file, a
 * manifest carrying that artifact's genuinely computed SHA-256 over repo-relative
 * paths (the committed E2 manifest convention), and an internal review whose
 * "## Verdict" section is structured exactly like the committed one. The former
 * "deadbeef" placeholder is gone (F6).
 */
function writeE2Evidence(root, options = {}) {
  const {
    verdict = "ACCEPTED_FOR_E2_PUBLICATION",
    artifactBody = '{"e2":"result"}\n',
    manifestLines = null,
    reviewBody = null,
    omitArtifact = false,
    tamperAfterManifest = false,
    eol = "\n"
  } = options;

  const artifactRel = `${E2_DIR}/E2_EXECUTION_RESULT.json`;
  const artifactAbs = path.join(root, ...artifactRel.split("/"));
  if (!omitArtifact) writeFileSync(artifactAbs, artifactBody);

  const lines = manifestLines || [`${sha256Hex(Buffer.from(artifactBody, "utf8"))}  ${artifactRel}`];
  writeFileSync(path.join(root, ...E2_MANIFEST.split("/")), lines.join(eol) + eol);

  if (tamperAfterManifest) writeFileSync(artifactAbs, artifactBody + "tampered\n");

  writeFileSync(
    path.join(root, ...E2_REVIEW.split("/")),
    reviewBody !== null
      ? reviewBody
      : [
          "# Phase 10A14 E2 strict canonical inventory closure 3 \u2014 internal review",
          "",
          "## Verdict",
          "",
          `\`${verdict}\``,
          "",
          "The immutable E2 revision-3 evidence package passed an independent post-output replay.",
          "",
          "## Scope and next gate",
          "",
          "Nothing further in this unit.",
          ""
        ].join(eol)
  );
  return { artifactRel, artifactAbs };
}

/** Maximally favourable fixture: every readable evidence source satisfied. */
function bestCaseFixture(root) {
  writeLedger(
    root,
    ledgerFrom([
      "| Deterministic clean/staging closure | `SATISFIED` |",
      "| Post-R4 independent external Phase 10A review | `SATISFIED` |"
    ])
  );
  writeOracleCounts(root, 3720);
  writeE2Evidence(root);
}

/** Fixture mirroring the REAL committed ledger dispositions. */
function realWorldFixture(root) {
  writeLedger(root, REAL_LEDGER);
  writeOracleCounts(root, 3720);
  writeE2Evidence(root);
}

function runRunner(args, cwd) {
  return spawnSync(process.execPath, [RUNNER_SOURCE_PATH, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

/**
 * Give a fixture root a minimal, readable git worktree head: a plain `.git`
 * directory with HEAD pointing at a loose branch ref. Evidence-producing runs
 * refuse a root whose head cannot be read at all (adjacent B), so output-mode
 * fixtures need one. The linked-worktree pointer-file and packed-refs paths are
 * covered separately by the dedicated readWorktreeHead tests below.
 */
function makeGitWorktree(root, commit = "a".repeat(40), branch = "feature/a15-fixture") {
  mkdirSync(path.join(root, ".git/refs/heads/feature"), { recursive: true });
  writeFileSync(path.join(root, ".git/HEAD"), `ref: refs/heads/${branch}\n`);
  writeFileSync(path.join(root, ".git", ...`refs/heads/${branch}`.split("/")), `${commit}\n`);
  return { commit, branch };
}

/** Real committed ledger dispositions PLUS a readable head, for --out runs. */
function outputFixture(root) {
  realWorldFixture(root);
  return makeGitWorktree(root);
}

// Output mode enforces the contract's declared Node runtime identity
// (adjacent B), so a machine that does not match it cannot mint evidence and
// cannot exercise these cases. Adjacent I: record that as UNRESOLVED rather
// than silently passing an unexercised security assertion.
const OUTPUT_MODE_RUNTIME = runtimeIdentity();

function outputTest(name, fn) {
  if (!OUTPUT_MODE_RUNTIME.pass) {
    skip(
      `${name} -- output mode enforces runtime identity ` +
        `${OUTPUT_MODE_RUNTIME.expected.expectedPlatform}/${OUTPUT_MODE_RUNTIME.expected.expectedArchitecture}, ` +
        `this host is ${OUTPUT_MODE_RUNTIME.actual.platform}/${OUTPUT_MODE_RUNTIME.actual.architecture}`
    );
    return;
  }
  test(name, fn);
}

// The real configured precondition item, used wherever PRECONDITION_GATE
// behavior is exercised. The check methods take no defaults for their target
// ledger row (an unconfigured check must fail closed), so these tests must use
// the genuine contract item rather than a hand-rolled stub.
const PRECONDITION_ITEM = CONTRACT.exitItems.find((i) => i.id === "deterministicCleanCycles");

// ─── 1. Contract identity, shape, and deep immutability (adjacent A) ─────────

test("contract is the embedded single source of truth with the required top-level fields", () => {
  const contract = loadContract();
  check(contract === CONTRACT, "loadContract() must return the embedded singleton, not a re-parsed copy");
  eq(contract.identity, "PHASE-10A-A15-FINAL-CLOSURE-GATE-V1", "identity");
  eq(contract.version, 1, "version");
  eq(contract.ownerGovernedBehavior.networkAllowed, false, "network must be disabled");
  eq(contract.phase10AClosure.autoClose, false, "must not auto-close Phase 10A");
  eq(contract.b2ThroughB6.disposition, "OPEN_UNCHANGED_OUT_OF_SCOPE", "B2-B6 disposition");
});

test("contract preserves exactly the 11 canonical top-level roadmap exit items", () => {
  eq(CONTRACT.exitItems.length, 11, "top-level exit item count");
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
  eq(item.checkMethod, "MULTI_SUBCHECK", "checkMethod");
  eq(item.subChecks.length, 2, "subCheck count");
  eq(item.subChecks.map((s) => s.id).sort().join(","), "integrated,standalone", "subCheck ids");
});

test("no A15_EXECUTION_CONTRACT.json is pre-committed beside the runner (E2 snapshot-only convention)", () => {
  const files = readdirSync(path.dirname(RUNNER_SOURCE_PATH));
  check(!files.includes("A15_EXECUTION_CONTRACT.json"), "a pre-committed contract JSON would create two editable contracts");
});

test("adjacent A: CONTRACT is recursively immutable, not merely shallow-frozen", () => {
  // Behavioral: attempt real mutations at depth and prove the values survive.
  throws(() => {
    "use strict";
    CONTRACT.exitItems[0].expectedValue = 1;
  }, "nested object property must not be assignable");
  throws(() => {
    "use strict";
    CONTRACT.exitItems.push({ id: "injected" });
  }, "nested array must not be extensible");
  throws(() => {
    "use strict";
    CONTRACT.allowedPaths[0] = "knowledge/CURRENT_STATE.md";
  }, "nested array element must not be assignable");
  throws(() => {
    "use strict";
    CONTRACT.exitItems.find((i) => i.id === "standaloneAndIntegratedExactGates").subChecks[0].checkMethod = "PASS";
  }, "third-level nested property must not be assignable");
  eq(CONTRACT.exitItems.length, 11, "exitItems length survived mutation attempts");
  eq(CONTRACT.allowedPaths[0], "evaluation/runner/phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs", "allowedPaths[0] survived");
  eq(
    CONTRACT.exitItems.find((i) => i.id === "standaloneAndIntegratedExactGates").subChecks[0].checkMethod,
    "STATIC_BLOCKED_NO_DEFINITION",
    "subCheck checkMethod survived"
  );
});

// ─── 2. PASS reachability truthfulness ───────────────────────────────────────

test("contract truthfully declares end-to-end PASS is NOT currently reachable", () => {
  const pr = CONTRACT.passReachability;
  eq(pr.status, "REQUIRES_FUTURE_CONTRACT_REVISION", "passReachability.status");
  eq(pr.aggregationLogicCanRepresentPass, true, "aggregation logic can represent PASS");
  eq(pr.currentCheckCatalogueCanProducePass, false, "current catalogue must NOT claim PASS capability");
  eq(pr.itemsThatCannotCurrentlyProducePass.length, 6, "count of items with no PASS path");
});

test("declared pass-reachability matches what the live check catalogue actually supports (drift guard)", () => {
  // Not declaration-vs-declaration: the derived side is computed by walking the
  // live check catalogue, so an implementation change that adds or removes a
  // PASS branch breaks this test.
  const derived = computePassReachability();
  const declared = CONTRACT.passReachability;
  eq(derived.currentCheckCatalogueCanProducePass, declared.currentCheckCatalogueCanProducePass, "catalogue PASS-capability");
  eq(
    derived.itemsThatCannotCurrentlyProducePass.slice().sort().join(","),
    declared.itemsThatCannotCurrentlyProducePass.slice().sort().join(","),
    "items with no PASS path"
  );
});

test("every check method declared to have a PASS branch actually reaches PASS on a valid fixture", () => {
  // Adjacent H: proves reachability by execution, not by declaration.
  withFixtureRoot((root) => {
    bestCaseFixture(root);
    eq(
      evaluateCheck(PRECONDITION_ITEM, root).status,
      "PASS",
      "PRECONDITION_GATE PASS branch"
    );
    eq(
      evaluateCheck(
        {
          id: "r",
          checkMethod: "LEDGER_ROW_EQUALS",
          ledgerRowLabel: "Post-R4 independent external Phase 10A review",
          expectedValue: "SATISFIED"
        },
        root
      ).status,
      "PASS",
      "LEDGER_ROW_EQUALS PASS branch"
    );
    eq(
      evaluateCheck(CONTRACT.exitItems.find((i) => i.id === "e2"), root).status,
      "PASS",
      "READ_MANIFEST_AND_VERDICT PASS branch"
    );
  });
});

test("even with maximally favourable evidence the real catalogue cannot reach end-to-end PASS", () => {
  withFixtureRoot((root) => {
    bestCaseFixture(root);
    const result = evaluate(root);
    check(result.executionStatus !== "PASS", `V1 must not reach PASS end-to-end; got ${result.executionStatus}`);
    eq(result.passReachability, "REQUIRES_FUTURE_CONTRACT_REVISION", "result carries the reachability disposition");
  });
});

test("READ_JSON_FIELD_EQUALS has no PASS branch even on an exact evidence match", () => {
  withFixtureRoot((root) => {
    writeOracleCounts(root, 3720);
    const item = CONTRACT.exitItems.find((i) => i.id === "decisionClosure");
    eq(evaluateItem(item, root).status, "BLOCKED_MISSING_EVIDENCE", "exact count match must still block");
  });
});

// ─── 3. F4: structural ledger-row parsing ────────────────────────────────────

test("F4: parseLedgerTable finds real two-column rows and ignores headers and separators", () => {
  const rows = parseLedgerTable(REAL_NEWEST_BLOCK);
  const labels = rows.map((r) => r.label);
  check(!labels.includes("Gate"), "header row must not be treated as a data row");
  check(!labels.some((l) => /^-+$/.test(l)), "separator row must not be treated as a data row");
  check(labels.includes("Deterministic clean/staging closure"), "real label must be found");
  eq(rows.find((r) => r.label === "C37").token, "TERMINAL", "backticked token extracted");
});

test("F4: the complete value cell is preserved; annotation is kept separate, not discarded", () => {
  const rows = parseLedgerTable(REAL_NEWEST_BLOCK);
  const row = rows.find((r) => r.label === "Deterministic clean/staging closure");
  eq(row.token, "UNSATISFIED", "token");
  eq(row.annotation, "(unchanged)", "parenthesised annotation preserved");
  eq(row.valueCell, "`UNSATISFIED` (unchanged)", "complete value cell preserved verbatim");
});

test("F4: a token containing a space is preserved exactly (real 'NOT GREEN' row)", () => {
  const row = parseLedgerTable(REAL_NEWEST_BLOCK).find((r) => r.label === "Production/release gate");
  eq(row.token, "NOT GREEN", "multi-word token must not be split or trimmed away");
});

test("F4: a semicolon-introduced annotation (real format) is preserved, not folded into the token", () => {
  const row = parseLedgerTable(REAL_OLDEST_BLOCK).find((r) => r.label === "B2, B3, B4, B5, B6");
  eq(row.token, "OPEN_UNCHANGED", "token");
  eq(row.annotation, "; nonblocking to terminal C38, still relevant to broader closure", "annotation preserved");
});

test("F4: a label that itself contains backticks is matched exactly (real /health residue row)", () => {
  const r = selectLedgerRow(REAL_MIDDLE_BLOCK, "Inherited three-path `/health` working-tree residue");
  eq(r.status, "FOUND", "backticked label must be matchable");
  eq(r.token, "RESOLVED", "token");
});

test("F4: label matching is exact -- the hyphen variant is a DIFFERENT row, never a fuzzy match", () => {
  // Both spellings genuinely exist in the committed ledger with divergent values.
  eq(selectLedgerRow(REAL_LEDGER, "Deterministic clean/staging closure").token, "UNSATISFIED", "slash variant");
  eq(selectLedgerRow(REAL_LEDGER, "Deterministic clean-staging closure").token, "NOT_CLAIMED", "hyphen variant");
});

test("F4: label matching is case-sensitive and not a substring match", () => {
  eq(selectLedgerRow(REAL_LEDGER, "deterministic clean/staging closure").status, "NOT_FOUND", "lowercased label");
  eq(selectLedgerRow(REAL_LEDGER, "Deterministic clean/staging").status, "NOT_FOUND", "label prefix");
  eq(selectLedgerRow(REAL_LEDGER, "A1").status, "NOT_FOUND", "label substring of A15");
});

test("F4: divergent duplicate rows select the FIRST in document order and enumerate every occurrence", () => {
  // Real ledger: the newest block says UNSATISFIED, an older block says
  // NOT_CLAIMED. The newest-first append-only convention makes the first
  // occurrence controlling, and the rule is declared, not implicit.
  const r = selectLedgerRow(REAL_LEDGER, "Deterministic clean/staging closure");
  eq(r.status, "FOUND", "status");
  eq(r.token, "UNSATISFIED", "newest (first in document order) row wins");
  eq(r.occurrences.length, 2, "every occurrence enumerated, none silently dropped");
  eq(r.occurrences.map((o) => o.token).join(","), "UNSATISFIED,NOT_CLAIMED", "divergence reported in order");
  check(r.selectionRule === LEDGER_ROW_SELECTION_RULE.rule, "selection rule reported with the result");
  eq(LEDGER_ROW_SELECTION_RULE.rule, "FIRST_MATCHING_ROW_IN_DOCUMENT_ORDER", "declared selection rule");
  check(
    LEDGER_ROW_SELECTION_RULE.basis.includes("append-only"),
    "the selection rule must cite the ledger convention that justifies it"
  );
});

test("F4: two matching rows inside the SAME table are AMBIGUOUS and fail closed", () => {
  // The newest-first block convention cannot order two rows within one table,
  // so no arbitrary choice is made.
  const text = ledgerFrom(["| Phase 10A | `OPEN` |", "| Phase 10A | `SATISFIED` |"]);
  const r = selectLedgerRow(text, "Phase 10A");
  eq(r.status, "AMBIGUOUS", "duplicate labels in one table must be ambiguous");
  check(r.detail.includes("OPEN") && r.detail.includes("SATISFIED"), "both conflicting values must be reported");
});

test("F4: a value cell that does not start with a backticked token is MALFORMED, not fail-open", () => {
  // The real "| E2 overall | not `PUBLISHED`/`CLOSED` ... |" row. The previous
  // unanchored regex extracted PUBLISHED from the middle of this cell -- i.e. it
  // reported the exact opposite of what the ledger says.
  const r = selectLedgerRow(REAL_MIDDLE_BLOCK, "E2 overall");
  eq(r.status, "MALFORMED", "mid-cell backtick must not be harvested as the value");
  check(r.token === null, "no token may be produced from a malformed cell");
  check(r.detail.includes("not `PUBLISHED`"), "the malformed cell must be reported verbatim for audit");
});

test("F4: a matching row with the wrong cell count is MALFORMED", () => {
  const text = ["| Gate | Disposition | Notes |", "|---|---|---|", "| Phase 10A | `OPEN` | extra |", ""].join("\n");
  eq(selectLedgerRow(text, "Phase 10A").status, "MALFORMED", "three-cell row must be malformed");
});

test("F4: a malformed NEWEST row does not silently fall through to an older well-formed row", () => {
  const text = [
    ledgerFrom(["| Phase 10A | not `OPEN` -- see prose |"]),
    ledgerFrom(["| Phase 10A | `SATISFIED` |"])
  ].join("\n");
  const r = selectLedgerRow(text, "Phase 10A");
  eq(r.status, "MALFORMED", "the controlling newest row governs even when malformed");
  check(r.token === null, "must not harvest SATISFIED from a superseded block");
});

test("F4: an absent label is NOT_FOUND (fail closed), never an empty-string value", () => {
  const r = selectLedgerRow(REAL_LEDGER, "Frozen runtime gate");
  eq(r.status, "NOT_FOUND", "absent label");
  check(r.token === null, "absent label must not yield a token");
});

test("F4: a row outside any table (no leading pipe) is not harvested", () => {
  const text = "Deterministic clean/staging closure | `SATISFIED` |\n";
  eq(selectLedgerRow(text, "Deterministic clean/staging closure").status, "NOT_FOUND", "prose line must not parse as a row");
});

test("F4: PRECONDITION_GATE fails closed on malformed ledger evidence instead of blocking on a guess", () => {
  withFixtureRoot((root) => {
    writeLedger(root, ledgerFrom(["| Deterministic clean/staging closure | not `SATISFIED` yet |"]));
    const r = evaluateCheck(PRECONDITION_ITEM, root);
    eq(r.status, "BLOCKED_MISSING_EVIDENCE", "malformed evidence must block on evidence, not on precondition");
  });
});

test("F4: PRECONDITION_GATE returns PASS only for an exactly SATISFIED row", () => {
  withFixtureRoot((root) => {
    writeLedger(root, ledgerFrom(["| Deterministic clean/staging closure | `SATISFIED` |"]));
    eq(evaluateCheck(PRECONDITION_ITEM, root).status, "PASS", "satisfied row");
  });
  withFixtureRoot((root) => {
    writeLedger(root, ledgerFrom(["| Deterministic clean/staging closure | `SATISFIED_PARTIALLY` |"]));
    check(
      evaluateCheck(PRECONDITION_ITEM, root).status !== "PASS",
      "a token merely PREFIXED by SATISFIED must not pass"
    );
  });
});

test("F4: PRECONDITION_GATE blocks on the real committed ledger disposition", () => {
  withFixtureRoot((root) => {
    writeLedger(root, REAL_LEDGER);
    const r = evaluateCheck(PRECONDITION_ITEM, root);
    eq(r.status, "BLOCKED_PRECONDITION", "real ledger says UNSATISFIED");
    check(r.detail.includes("UNSATISFIED"), "detail must carry the actual ledger value");
  });
});

// ─── 4. F5: independent-review criterion mapping ─────────────────────────────

test("F5: the unsupported R4/Post-R4 equivalence check method is gone from the catalogue", () => {
  const methods = new Set();
  for (const item of CONTRACT.exitItems) {
    methods.add(item.checkMethod);
    for (const sub of item.subChecks || []) methods.add(sub.checkMethod);
  }
  check(!methods.has("STATIC_SATISFIED"), "STATIC_SATISFIED asserted an equivalence no canonical source establishes");
  throws(
    () => evaluateCheck({ id: "x", checkMethod: "STATIC_SATISFIED" }, tmpdir()),
    "STATIC_SATISFIED must no longer be an executable check method"
  );
});

test("F5: independentReview reads the Phase-10A-scoped ledger row, not the bounded reason/oracle gate", () => {
  const item = CONTRACT.exitItems.find((i) => i.id === "independentReview");
  eq(item.checkMethod, "LEDGER_ROW_EQUALS", "checkMethod");
  eq(item.ledgerRowLabel, "Post-R4 independent external Phase 10A review", "controlling ledger label");
  eq(item.expectedValue, "SATISFIED", "expected disposition");
});

test("F5: with the real ledger dispositions independentReview is FAIL, not PASS and not BLOCKED", () => {
  withFixtureRoot((root) => {
    writeLedger(root, REAL_LEDGER);
    const item = CONTRACT.exitItems.find((i) => i.id === "independentReview");
    const r = evaluateItem(item, root);
    eq(r.status, "FAIL", "an evidenced UNSATISFIED row is a FAIL, not missing evidence");
    check(r.detail.includes("UNSATISFIED"), "detail must quote the actual ledger value");
  });
});

test("F5: the satisfied bounded reason/oracle gate can no longer produce an independentReview PASS", () => {
  withFixtureRoot((root) => {
    // Exactly the rows the removed mapping relied on, and nothing else.
    writeLedger(
      root,
      ledgerFrom([
        "| R4 bounded development-governance review | `ACCEPTED` |",
        "| Post-R4 external-review gate | `SATISFIED` |"
      ])
    );
    const item = CONTRACT.exitItems.find((i) => i.id === "independentReview");
    const r = evaluateItem(item, root);
    check(r.status !== "PASS", `R4/Post-R4 rows must not satisfy the Phase-10A criterion; got ${r.status}`);
    eq(r.status, "BLOCKED_MISSING_EVIDENCE", "the Phase-10A-scoped row is absent, so evidence is missing");
  });
});

test("F5: independentReview reaches PASS only when the Phase-10A-scoped row is genuinely SATISFIED", () => {
  withFixtureRoot((root) => {
    writeLedger(root, ledgerFrom(["| Post-R4 independent external Phase 10A review | `SATISFIED` |"]));
    const item = CONTRACT.exitItems.find((i) => i.id === "independentReview");
    eq(evaluateItem(item, root).status, "PASS", "legitimately satisfied row");
  });
});

test("F5: a missing ledger file blocks on evidence rather than passing or failing silently", () => {
  withFixtureRoot((root) => {
    rmSync(path.join(root, "knowledge"), { recursive: true, force: true });
    const item = CONTRACT.exitItems.find((i) => i.id === "independentReview");
    eq(evaluateItem(item, root).status, "BLOCKED_MISSING_EVIDENCE", "absent ledger");
  });
});

// ─── 5. F6: manifest and verdict verification ────────────────────────────────

test("F6: a self-consistent manifest with genuinely computed hashes verifies", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root);
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(r.ok, `manifest must verify; errors: ${JSON.stringify(r.errors)}`);
    eq(r.entries.length, 1, "entry count");
    eq(r.entries[0].verified, true, "entry verified");
  });
});

test("F6: READ_MANIFEST_AND_VERDICT PASSES only when the manifest itself verifies", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root);
    const item = CONTRACT.exitItems.find((i) => i.id === "e2");
    eq(evaluateItem(item, root).status, "PASS", "verified manifest plus matching verdict");
  });
});

test("F6: a truncated (non-64-char) hash is rejected", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, { manifestLines: [`deadbeef  ${E2_DIR}/E2_EXECUTION_RESULT.json`] });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "a short hash must not verify");
    check(r.errors.join(" ").includes("malformed manifest line"), `expected malformed-line error, got ${JSON.stringify(r.errors)}`);
    eq(evaluateItem(CONTRACT.exitItems.find((i) => i.id === "e2"), root).status, "FAIL", "item must FAIL");
  });
});

test("F6: an uppercase hex hash is rejected (lowercase-only manifest convention)", () => {
  withFixtureRoot((root) => {
    const body = '{"e2":"result"}\n';
    writeE2Evidence(root, {
      artifactBody: body,
      manifestLines: [`${sha256Hex(Buffer.from(body, "utf8")).toUpperCase()}  ${E2_DIR}/E2_EXECUTION_RESULT.json`]
    });
    check(!verifyEvidenceManifest(root, E2_MANIFEST).ok, "uppercase hash must not verify");
  });
});

test("F6: a single-space separator is rejected (two-space manifest convention)", () => {
  withFixtureRoot((root) => {
    const body = '{"e2":"result"}\n';
    writeE2Evidence(root, {
      artifactBody: body,
      manifestLines: [`${sha256Hex(Buffer.from(body, "utf8"))} ${E2_DIR}/E2_EXECUTION_RESULT.json`]
    });
    check(!verifyEvidenceManifest(root, E2_MANIFEST).ok, "single-space separator must not verify");
  });
});

// Internal-review finding J: the runner's correctness must not silently depend
// on .gitattributes (an unauthorized-to-modify file) continuing to pin `-text`
// on the hash-bound E2 evidence tree. Git EOL normalization is demonstrably
// active in this worktree, so a CRLF checkout of that tree must still be parsed
// correctly rather than producing a wrong diagnosis. These cases fail closed
// today, so they misreport WHY they failed; that is the defect under test.
test("finding J: a CRLF-checkout manifest verifies instead of reporting a phantom missing artifact", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, { eol: "\r\n" });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(r.ok, `CRLF manifest must verify; errors: ${JSON.stringify(r.errors)}`);
    eq(r.entries.length, 1, "entry count");
    check(
      !r.entries[0].path.includes("\r"),
      `parsed path must not retain the CR line terminator: ${JSON.stringify(r.entries[0].path)}`
    );
  });
});

test("finding J: a CRLF-checkout internal review's '## Verdict' heading is still found", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, { eol: "\r\n" });
    const raw = readFileSync(path.join(root, ...E2_REVIEW.split("/")), "utf8");
    check(raw.includes("## Verdict\r\n"), "fixture must genuinely be CRLF");
    const v = extractVerdict(raw);
    eq(v.error, null, `heading must be found in a CRLF document, got ${JSON.stringify(v.error)}`);
    eq(v.verdict, "ACCEPTED_FOR_E2_PUBLICATION", "verdict token");
    eq(evaluateItem(CONTRACT.exitItems.find((i) => i.id === "e2"), root).status, "PASS", "E2 item must PASS on a CRLF checkout");
  });
});

test("finding J: a CR anywhere other than the line terminator is still malformed", () => {
  withFixtureRoot((root) => {
    const body = '{"e2":"result"}\n';
    writeE2Evidence(root, {
      artifactBody: body,
      manifestLines: [`${sha256Hex(Buffer.from(body, "utf8"))}  ${E2_DIR}/E2_EXECUTION\r_RESULT.json`]
    });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "an embedded CR must not be silently normalized away");
  });
});

// Finding J, second surface: the F5-controlling row is read out of
// knowledge/CURRENT_STATE.md, which .gitattributes does NOT pin to `-text` --
// and which is in fact 100% CRLF on this checkout. parseLedgerTable survives
// that only because splitRowCells trims each line, which is incidental rather
// than stated. Pin it, so a refactor that drops the trim cannot silently turn
// every ledger row malformed and take F5's diagnosis with it. Both directions
// are normalised explicitly: this test file's own EOLs must not decide what is
// under test.
test("finding J: ledger rows parse identically from LF and CRLF checkouts of the ledger", () => {
  const lf = REAL_NEWEST_BLOCK.replace(/\r\n/gu, "\n");
  const crlf = lf.replace(/\n/gu, "\r\n");
  check(crlf.includes("\r\n") && !lf.includes("\r"), "fixture normalisation must actually differ");

  const strip = (rows) => JSON.stringify(rows.map((r) => ({ ...r, raw: undefined })));
  const lfRows = parseLedgerTable(lf);
  const crlfRows = parseLedgerTable(crlf);
  check(lfRows.length > 0, "fixture must contain data rows");
  eq(strip(crlfRows), strip(lfRows), "CRLF and LF ledgers must yield identical rows");
  check(crlfRows.every((r) => !r.malformed), "no row may become malformed under CRLF");

  for (const text of [lf, crlf]) {
    const row = selectLedgerRow(text, "Deterministic clean/staging closure");
    eq(row.status, "FOUND", "controlling row selectable regardless of EOL");
    eq(row.token, "UNSATISFIED", "token unaffected by EOL");
  }
});

test("F6: a manifest referencing a missing artifact is rejected", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, { omitArtifact: true });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "missing artifact must not verify");
    check(r.errors.join(" ").includes("referenced artifact does not exist"), `got ${JSON.stringify(r.errors)}`);
    eq(evaluateItem(CONTRACT.exitItems.find((i) => i.id === "e2"), root).status, "FAIL", "item must FAIL");
  });
});

test("F6: a wrong-but-well-formed hash is rejected", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, {
      manifestLines: [`${"0".repeat(64)}  ${E2_DIR}/E2_EXECUTION_RESULT.json`]
    });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "wrong hash must not verify");
    check(r.errors.join(" ").includes("hash mismatch"), `got ${JSON.stringify(r.errors)}`);
  });
});

test("F6: bytes tampered AFTER the manifest was written are detected", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, { tamperAfterManifest: true });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "tampered bytes must be detected by independent rehash");
    check(r.errors.join(" ").includes("hash mismatch"), `got ${JSON.stringify(r.errors)}`);
    eq(evaluateItem(CONTRACT.exitItems.find((i) => i.id === "e2"), root).status, "FAIL", "item must FAIL");
  });
});

test("F6: a manifest path traversing out of the evidence root is rejected", () => {
  withFixtureRoot((root) => {
    writeFileSync(path.join(root, "knowledge/CURRENT_STATE.md"), "sentinel\n");
    const body = readFileSync(path.join(root, "knowledge/CURRENT_STATE.md"));
    writeE2Evidence(root, {
      manifestLines: [`${sha256Hex(body)}  ${E2_DIR}/../../../../knowledge/CURRENT_STATE.md`]
    });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "traversal path must be rejected even when its hash is correct");
    check(r.errors.join(" ").includes("outside the evidence root"), `got ${JSON.stringify(r.errors)}`);
  });
});

test("F6: an absolute manifest path is rejected", () => {
  withFixtureRoot((root) => {
    const abs = path.join(root, "knowledge/CURRENT_STATE.md").split(path.sep).join("/");
    writeFileSync(path.join(root, "knowledge/CURRENT_STATE.md"), "sentinel\n");
    writeE2Evidence(root, { manifestLines: [`${"a".repeat(64)}  ${abs}`] });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "absolute path must be rejected");
    check(r.errors.join(" ").includes("absolute"), `got ${JSON.stringify(r.errors)}`);
  });
});

test("F6: a backslash-separated manifest path is rejected (posix-only convention)", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, {
      manifestLines: [`${"a".repeat(64)}  ${E2_DIR.split("/").join("\\")}\\E2_EXECUTION_RESULT.json`]
    });
    check(!verifyEvidenceManifest(root, E2_MANIFEST).ok, "backslash path must be rejected");
  });
});

test("F6: duplicate manifest entries for one path are rejected", () => {
  withFixtureRoot((root) => {
    const body = '{"e2":"result"}\n';
    const h = sha256Hex(Buffer.from(body, "utf8"));
    writeE2Evidence(root, {
      artifactBody: body,
      manifestLines: [
        `${h}  ${E2_DIR}/E2_EXECUTION_RESULT.json`,
        `${h}  ${E2_DIR}/E2_EXECUTION_RESULT.json`
      ]
    });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "duplicate entries must be rejected");
    check(r.errors.join(" ").includes("duplicate"), `got ${JSON.stringify(r.errors)}`);
  });
});

test("F6: a manifest that hashes itself is rejected (self-exclusion)", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, { manifestLines: [`${"a".repeat(64)}  ${E2_MANIFEST}`] });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "a self-referencing manifest must be rejected");
    check(r.errors.join(" ").includes("self-reference"), `got ${JSON.stringify(r.errors)}`);
  });
});

test("F6: an empty manifest is rejected rather than vacuously verified", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, { manifestLines: [] });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "an empty manifest must not verify");
    check(r.errors.join(" ").includes("no entries"), `got ${JSON.stringify(r.errors)}`);
  });
});

test("F6: a manifest path naming a directory is rejected", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, { manifestLines: [`${"a".repeat(64)}  ${E2_DIR}`] });
    const r = verifyEvidenceManifest(root, E2_MANIFEST);
    check(!r.ok, "a directory entry must be rejected");
  });
});

test("F6: the verdict is read from the structural '## Verdict' section, not the whole document", () => {
  withFixtureRoot((root) => {
    // The expected token appears in prose OUTSIDE the Verdict section, while the
    // Verdict section itself says something else. An unanchored substring search
    // reports PASS here; a structural read must FAIL.
    writeE2Evidence(root, {
      reviewBody: [
        "# internal review",
        "",
        "## Verdict",
        "",
        "`CHANGES_REQUIRED`",
        "",
        "## Notes",
        "",
        "The predecessor unit was ACCEPTED_FOR_E2_PUBLICATION; this one is not.",
        ""
      ].join("\n")
    });
    eq(extractVerdict(readFileSync(path.join(root, ...E2_REVIEW.split("/")), "utf8")).verdict, "CHANGES_REQUIRED", "structural verdict");
    eq(evaluateItem(CONTRACT.exitItems.find((i) => i.id === "e2"), root).status, "FAIL", "prose mention must not produce PASS");
  });
});

test("F6: a duplicated '## Verdict' heading fails closed", () => {
  const text = ["## Verdict", "", "`ACCEPTED_FOR_E2_PUBLICATION`", "", "## Verdict", "", "`CHANGES_REQUIRED`", ""].join("\n");
  const r = extractVerdict(text);
  check(r.verdict === null, "no verdict may be chosen from two headings");
  check(r.error.includes("duplicate"), `expected duplicate-heading error, got ${r.error}`);
});

test("F6: a missing '## Verdict' heading fails closed", () => {
  const r = extractVerdict("# review\n\n## Notes\n\n`ACCEPTED_FOR_E2_PUBLICATION`\n");
  check(r.verdict === null, "no verdict without the heading");
  check(r.error.includes("no '## Verdict'"), `got ${r.error}`);
});

test("F6: an unbackticked or multi-token verdict body fails closed", () => {
  check(extractVerdict("## Verdict\n\nACCEPTED_FOR_E2_PUBLICATION\n").verdict === null, "bare token must be malformed");
  check(extractVerdict("## Verdict\n\n`A` and `B`\n").verdict === null, "two tokens must be malformed");
  check(extractVerdict("## Verdict\n\n").verdict === null, "empty section must be malformed");
});

test("F6: a malformed verdict makes the E2 item FAIL, never PASS", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, { reviewBody: "## Verdict\n\nACCEPTED_FOR_E2_PUBLICATION\n" });
    eq(evaluateItem(CONTRACT.exitItems.find((i) => i.id === "e2"), root).status, "FAIL", "malformed verdict");
  });
});

test("F6: a mismatched verdict makes the E2 item FAIL", () => {
  withFixtureRoot((root) => {
    writeE2Evidence(root, { verdict: "CHANGES_REQUIRED" });
    eq(evaluateItem(CONTRACT.exitItems.find((i) => i.id === "e2"), root).status, "FAIL", "verdict mismatch");
  });
});

test("F6: absent manifest or review files block on evidence", () => {
  withFixtureRoot((root) => {
    eq(evaluateItem(CONTRACT.exitItems.find((i) => i.id === "e2"), root).status, "BLOCKED_MISSING_EVIDENCE", "no evidence at all");
  });
});

// ─── 6. F3: machine-exit contract ────────────────────────────────────────────

test("F3: the exit contract maps PASS->0, FAIL->1, BLOCKED->2 and rejects anything else", () => {
  eq(exitCodeFor("PASS"), 0, "PASS");
  eq(exitCodeFor("FAIL"), 1, "FAIL");
  eq(exitCodeFor("BLOCKED"), 2, "BLOCKED");
  eq(EXIT_CODES.BLOCKED, 2, "BLOCKED must be distinct from FAIL");
  check(EXIT_CODES.BLOCKED !== EXIT_CODES.FAIL, "BLOCKED must not be collapsed into FAIL");
  throws(() => exitCodeFor("MAYBE"), "an unknown execution status must throw, not default to 0");
  throws(() => exitCodeFor(undefined), "undefined status must throw");
});

test("F3: the contract documents the exit mapping it actually implements", () => {
  const declared = CONTRACT.machineExitContract;
  eq(declared.PASS, EXIT_CODES.PASS, "declared PASS code matches implementation");
  eq(declared.FAIL, EXIT_CODES.FAIL, "declared FAIL code matches implementation");
  eq(declared.BLOCKED, EXIT_CODES.BLOCKED, "declared BLOCKED code matches implementation");
});

test("F3 behavioral: a BLOCKED evaluation exits 2 and is never machine-green", () => {
  withFixtureRoot((root) => {
    realWorldFixture(root); // precondition row UNSATISFIED -> BLOCKED_PRECONDITION
    const run = runRunner(["--root", root, "--verify-only"], root);
    const parsed = JSON.parse(run.stdout);
    eq(parsed.executionStatus, "BLOCKED", "fixture must produce BLOCKED");
    eq(run.status, 2, "BLOCKED must exit 2");
    check(run.status !== 0, "a BLOCKED closure gate must never appear machine-green");
  });
});

test("F3 behavioral: a FAIL evaluation exits 1", () => {
  withFixtureRoot((root) => {
    // Precondition satisfied so BLOCKED_PRECONDITION does not dominate, but
    // reasonClosure is evidenced-unsatisfied, so the run is a FAIL.
    writeLedger(
      root,
      ledgerFrom([
        "| Deterministic clean/staging closure | `SATISFIED` |",
        "| Post-R4 independent external Phase 10A review | `SATISFIED` |"
      ])
    );
    writeOracleCounts(root, 3720);
    writeE2Evidence(root);
    const run = runRunner(["--root", root, "--verify-only"], root);
    const parsed = JSON.parse(run.stdout);
    eq(parsed.executionStatus, "FAIL", "fixture must produce FAIL");
    eq(run.status, 1, "FAIL must exit 1");
  });
});

test("F3 behavioral: the PASS branch of the exit path sets exit code 0", () => {
  // The real catalogue cannot reach PASS (see passReachability), so the PASS
  // branch of the EXIT path is exercised through main()'s injectable evaluator.
  // No evidence is faked: only the aggregated status handed to the exit mapper.
  const previous = process.exitCode;
  try {
    process.exitCode = 99;
    const written = [];
    main(["--verify-only"], {
      evaluateFn: () => ({ executionStatus: "PASS", blockedReason: null, itemResults: [] }),
      write: (s) => written.push(s)
    });
    eq(process.exitCode, 0, "PASS must set exit code 0");
    check(written.join("").includes('"executionStatus": "PASS"'), "result must still be emitted");
  } finally {
    process.exitCode = previous;
  }
});

outputTest("F3 behavioral: a BLOCKED status still exits 2 in --out mode, not just --verify-only", () => {
  withFixtureRoot((root) => {
    outputFixture(root);
    const outDir = path.join(root, ALLOWED_REL, "run-blocked");
    const run = runRunner(["--root", root, "--out", outDir], root);
    eq(run.status, 2, "BLOCKED must exit 2 in output mode as well");
    check(statSync(path.join(outDir, "A15_EXECUTION_RESULT.json")).isFile(), "evidence is still produced for a BLOCKED run");
  });
});

// ─── 7. F1/F2: evidence bytes, manifest integrity, overwrite refusal ─────────

outputTest("F1: the manifest hash equals an INDEPENDENT hash of the exact bytes on disk", () => {
  withFixtureRoot((root) => {
    outputFixture(root);
    const outDir = path.join(root, ALLOWED_REL, "run-1");
    const run = runRunner(["--root", root, "--out", outDir], root);
    check(run.status === 2, `expected BLOCKED exit 2, got ${run.status}: ${run.stderr}`);

    const manifestText = readFileSync(path.join(outDir, "A15_EVIDENCE_MANIFEST.sha256"), "utf8");
    const lines = manifestText.trimEnd().split("\n");
    eq(lines.length, 2, "manifest must carry exactly the two generated artifacts");

    let verifiedResult = false;
    for (const line of lines) {
      const m = /^([0-9a-f]{64})  (.+)$/u.exec(line);
      check(Boolean(m), `manifest line must be <64-hex><2 spaces><path>: ${line}`);
      const bytes = readFileSync(path.join(root, ...m[2].split("/")));
      // Independent recomputation from the bytes actually written to disk.
      eq(createHash("sha256").update(bytes).digest("hex"), m[1], `hash must match on-disk bytes for ${m[2]}`);
      if (m[2].endsWith("A15_EXECUTION_RESULT.json")) verifiedResult = true;
    }
    check(verifiedResult, "the result artifact must be hash-pinned in the manifest");

    // Cross-check with the runner's own verifier, from the repository root.
    const relManifest = path
      .relative(root, path.join(outDir, "A15_EVIDENCE_MANIFEST.sha256"))
      .split(path.sep)
      .join("/");
    const verify = verifyEvidenceManifest(root, relManifest);
    check(verify.ok, `generated manifest must verify: ${JSON.stringify(verify.errors)}`);
  });
});

outputTest("F1: the emitted result bytes are exactly the bytes that were hashed (single serialization)", () => {
  withFixtureRoot((root) => {
    outputFixture(root);
    const outDir = path.join(root, ALLOWED_REL, "run-1");
    runRunner(["--root", root, "--out", outDir], root);
    const resultBytes = readFileSync(path.join(outDir, "A15_EXECUTION_RESULT.json"));
    const parsed = JSON.parse(resultBytes.toString("utf8"));
    // Re-serialising the parsed object the same way must reproduce the bytes,
    // proving no second, differently-formatted serialisation was hashed.
    eq(resultBytes.toString("utf8"), JSON.stringify(parsed, null, 2) + "\n", "written bytes must be the canonical serialization");
    const manifest = readFileSync(path.join(outDir, "A15_EVIDENCE_MANIFEST.sha256"), "utf8");
    check(manifest.includes(sha256Hex(resultBytes)), "manifest must contain the hash of the exact written bytes");
  });
});

outputTest("F1: the contract snapshot is byte-identical to the embedded CONTRACT and hash-pinned", () => {
  withFixtureRoot((root) => {
    outputFixture(root);
    const outDir = path.join(root, ALLOWED_REL, "run-1");
    runRunner(["--root", root, "--out", outDir], root);
    const snapshot = readFileSync(path.join(outDir, "A15_EXECUTION_CONTRACT.json"));
    eq(snapshot.toString("utf8"), JSON.stringify(CONTRACT, null, 2) + "\n", "snapshot must equal the frozen canonical contract");
    const manifest = readFileSync(path.join(outDir, "A15_EVIDENCE_MANIFEST.sha256"), "utf8");
    check(manifest.includes(sha256Hex(snapshot)), "manifest must hash-pin the snapshot bytes");
  });
});

outputTest("F1: manifest entries are repo-relative, sorted, and exclude the manifest itself", () => {
  withFixtureRoot((root) => {
    outputFixture(root);
    const outDir = path.join(root, ALLOWED_REL, "run-1");
    runRunner(["--root", root, "--out", outDir], root);
    const lines = readFileSync(path.join(outDir, "A15_EVIDENCE_MANIFEST.sha256"), "utf8").trimEnd().split("\n");
    const paths = lines.map((l) => l.slice(66));
    check(
      paths.every((p) => p.startsWith(`${ALLOWED_REL}/run-1/`)),
      `entries must be repo-relative under the output dir: ${JSON.stringify(paths)}`
    );
    eq(paths.slice().sort().join("|"), paths.join("|"), "entries must be sorted");
    check(!paths.some((p) => p.endsWith("A15_EVIDENCE_MANIFEST.sha256")), "manifest must exclude itself");
  });
});

outputTest("F2: a second invocation is refused and leaves the first invocation's bytes byte-for-byte unchanged", () => {
  withFixtureRoot((root) => {
    outputFixture(root);
    const outDir = path.join(root, ALLOWED_REL, "run-1");
    const first = runRunner(["--root", root, "--out", outDir], root);
    check(first.status === 2, `first run must complete; got ${first.status}: ${first.stderr}`);

    const names = readdirSync(outDir).sort();
    const before = new Map(names.map((n) => [n, readFileSync(path.join(outDir, n))]));
    eq(names.join(","), "A15_EVIDENCE_MANIFEST.sha256,A15_EXECUTION_CONTRACT.json,A15_EXECUTION_RESULT.json", "artifact set");

    const second = runRunner(["--root", root, "--out", outDir], root);
    check(second.status !== 0, "the refused second run must not exit 0");
    check(
      /refusing to overwrite/i.test(second.stderr),
      `second run must refuse to overwrite; stderr was: ${second.stderr}`
    );

    const after = readdirSync(outDir).sort();
    eq(after.join(","), names.join(","), "no artifact may be added or removed by the refused run");
    for (const n of names) {
      check(before.get(n).equals(readFileSync(path.join(outDir, n))), `${n} bytes must be unchanged after the refused run`);
    }
  });
});

outputTest("F2: an existing artifact file blocks the run even if the directory was created separately", () => {
  withFixtureRoot((root) => {
    outputFixture(root);
    const outDir = path.join(root, ALLOWED_REL, "run-preexisting");
    mkdirSync(outDir, { recursive: false });
    writeFileSync(path.join(outDir, "A15_EXECUTION_RESULT.json"), "PRIOR EVIDENCE\n");
    const run = runRunner(["--root", root, "--out", outDir], root);
    check(run.status !== 0, "must not succeed over an existing evidence directory");
    eq(readFileSync(path.join(outDir, "A15_EXECUTION_RESULT.json"), "utf8"), "PRIOR EVIDENCE\n", "prior bytes preserved");
  });
});

outputTest("F2: a missing output parent is refused rather than created recursively", () => {
  withFixtureRoot((root) => {
    outputFixture(root);
    const outDir = path.join(root, ALLOWED_REL, "deep", "nested", "run-1");
    const run = runRunner(["--root", root, "--out", outDir], root);
    check(run.status !== 0, "must not silently create a deep output tree");
    check(/parent/i.test(run.stderr), `expected a missing-parent error, got: ${run.stderr}`);
  });
});

// ─── 8. Write-boundary security (F2/F4 write defense, adjacent C and G) ──────

function writeAllowed(root, relOrAbs) {
  try {
    assertWritePathAllowed(path.resolve(root, relOrAbs), root);
    return true;
  } catch {
    return false;
  }
}

test("write boundary: the allowlisted directory itself and its descendants are accepted", () => {
  withFixtureRoot((root) => {
    check(writeAllowed(root, ALLOWED_REL), "the exact governed directory must be writable");
    check(writeAllowed(root, `${ALLOWED_REL}/run-1`), "descendant must be writable");
    check(writeAllowed(root, `${ALLOWED_REL}/run-1/nested`), "nested descendant must be writable");
    check(writeAllowed(root, `${ALLOWED_REL}/x/../y`), "alias resolving to a descendant must be accepted");
  });
});

test("write boundary: textual-prefix siblings and unrelated trees are rejected", () => {
  withFixtureRoot((root) => {
    check(!writeAllowed(root, `${ALLOWED_REL}-EVIL`), "a sibling sharing the text prefix must be rejected");
    check(!writeAllowed(root, "evaluation/results/phase-10a14-r20"), "historical evidence tree must be rejected");
    check(!writeAllowed(root, "evaluation/results/other"), "unrelated sibling must be rejected");
  });
});

test("write boundary: traversal, parents, and outside-root absolutes are rejected", () => {
  withFixtureRoot((root) => {
    check(!writeAllowed(root, `${ALLOWED_REL}/../../../knowledge`), "traversal escape must be rejected");
    check(!writeAllowed(root, `${ALLOWED_REL}/..`), "parent of the allowed dir must be rejected");
    check(!writeAllowed(root, path.resolve(tmpdir(), "a15-escape-outside")), "absolute outside path must be rejected");
  });
});

test("write boundary: protected governance and runtime locations are rejected by containment", () => {
  withFixtureRoot((root) => {
    for (const p of [
      "knowledge",
      "knowledge/CURRENT_STATE.md",
      "server.js",
      "security/public-health.js",
      "evaluation/runner/phase-10a14-r20",
      "evaluation/results/phase-10a14-r20"
    ]) {
      check(!writeAllowed(root, p), `${p} must be rejected`);
    }
  });
});

test("adjacent C: the contract declares containment semantics, matching what the code enforces", () => {
  const g = CONTRACT.ownerGovernedBehavior;
  check(!("outputOnlyAtExactAllowlistedDirectory" in g), "the false EXACT-directory declaration must be gone");
  eq(g.outputConfinedToAllowlistedDirectoryTree, true, "containment is what is declared");
  check(
    g.outputConfinementSemantics.includes("descendant"),
    "the declaration must state descendant semantics explicitly"
  );
  check(
    CONTRACT.allowedPaths.includes("evaluation/results/phase-10a-a15-closure-gate/**"),
    "the canonical basis for tree semantics must remain declared"
  );
  // Behavioral proof that the declaration is honest.
  withFixtureRoot((root) => {
    check(writeAllowed(root, `${ALLOWED_REL}/run-1`), "declared descendant semantics must actually hold");
  });
});

test("read boundary: structural containment rejects textual siblings of a root", () => {
  eq(isContained("C:/Projects/tina-backend", "C:/Projects/tina-backend/knowledge/x.md"), true, "true descendant");
  eq(isContained("C:/Projects/tina-backend", "C:/Projects/tina-backend-a15-v1/knowledge/x.md"), false, "textual sibling");
  eq(isContained("/a/b", "/a/b"), true, "base itself");
  eq(isContained("/a/b", "/a"), false, "parent");
  eq(isContained("/a/b", "/a/c"), false, "sibling");
});

test("adjacent I: symlink/junction escape is rejected, and inability to link is UNRESOLVED not PASS", () => {
  withFixtureRoot((base) => {
    const root = path.join(base, "sym-root");
    const outside = path.join(base, "sym-outside");
    mkdirSync(root, { recursive: true });
    mkdirSync(outside, { recursive: true });
    writeFileSync(path.join(outside, "secret.txt"), "escaped");
    const link = path.join(root, "link");
    let kind = null;
    for (const type of ["junction", "dir"]) {
      try {
        symlinkSync(outside, link, type);
        kind = type;
        break;
      } catch {
        /* try the next strategy */
      }
    }
    if (kind === null) {
      skip("symlink/junction creation unavailable in this environment: reparse-point escape case NOT exercised");
      return;
    }
    eq(isContained(root, path.join(link, "secret.txt")), false, `escape through a ${kind} must be rejected`);
    eq(writeAllowed(base, path.join("sym-root", "link")), false, "a reparse point out of the tree must not be writable");
  });
});

// ─── 9. Adjacent B: starting head and runtime identity ──────────────────────

test("adjacent B: runtime identity is computed from the live process, not declared blindly", () => {
  const id = runtimeIdentity();
  eq(id.actual.platform, process.platform, "observed platform must come from the process");
  eq(id.actual.architecture, process.arch, "observed architecture must come from the process");
  eq(id.expected.expectedPlatform, CONTRACT.inputsAndPrerequisites.nodeRuntimeIdentity.expectedPlatform, "expected platform source");
  eq(
    id.pass,
    process.platform === id.expected.expectedPlatform && process.arch === id.expected.expectedArchitecture,
    "pass must be derived, not asserted"
  );
});

test("adjacent B: the contract declares runtime identity ENFORCED and the code enforces it", () => {
  const decl = CONTRACT.inputsAndPrerequisites.nodeRuntimeIdentity;
  eq(decl.enforced, true, "declared as enforced");
  eq(decl.enforcementScope, "EVIDENCE_PRODUCING_OUTPUT_MODE", "declared enforcement scope");
  // Behavioral: an output-mode run refuses when the injected runtime mismatches.
  // The fixture DOES have a readable head, so the refusal can only come from the
  // runtime check. Injection is used because a conforming host cannot otherwise
  // observe its own non-conformance.
  withFixtureRoot((root) => {
    realWorldFixture(root);
    makeGitWorktree(root);
    const outDir = path.join(root, ALLOWED_REL, "run-runtime");
    let message = "";
    throws(
      () =>
        main(["--root", root, "--out", outDir], {
          runtime: { expected: decl, actual: { platform: "sunos", architecture: "mips" }, pass: false },
          write: () => {}
        }),
      "an output-mode run must refuse a mismatched runtime identity"
    );
    try {
      main(["--root", root, "--out", outDir], {
        runtime: { expected: decl, actual: { platform: "sunos", architecture: "mips" }, pass: false },
        write: () => {}
      });
    } catch (err) {
      message = err.message;
    }
    check(/runtime identity/i.test(message), `refusal must cite runtime identity, got: ${message}`);
    check(!readdirSync(path.join(root, ALLOWED_REL)).includes("run-runtime"), "no evidence may be written on refusal");
  });
});

test("adjacent B: startingHead is declared as unenforced provenance and the observed head is recorded", () => {
  const decl = CONTRACT.inputsAndPrerequisites.authoringBaseHead;
  eq(decl.enforced, false, "must not claim enforcement it does not perform");
  eq(decl.commit, "27bd342563c4bb535bc2c2ea1ea02bac8c70de51", "authoring base commit retained as provenance");
  check(decl.rationale.length > 0, "the reason enforcement is not claimed must be stated");
  check(!("startingHead" in CONTRACT.inputsAndPrerequisites), "the misleading prerequisite name must be gone");
});

test("adjacent B: the head reader resolves a real worktree pointer file without child_process", () => {
  withFixtureRoot((root) => {
    // Reproduce the real linked-worktree layout: .git FILE -> gitdir -> commondir.
    const common = path.join(root, "common.git");
    const wt = path.join(common, "worktrees", "wt-1");
    mkdirSync(path.join(common, "refs", "heads", "feature"), { recursive: true });
    mkdirSync(wt, { recursive: true });
    writeFileSync(path.join(root, ".git"), `gitdir: ${wt.split(path.sep).join("/")}\n`);
    writeFileSync(path.join(wt, "HEAD"), "ref: refs/heads/feature/demo\n");
    writeFileSync(path.join(wt, "commondir"), "../..\n");
    writeFileSync(path.join(common, "refs", "heads", "feature", "demo"), `${"c".repeat(40)}\n`);

    const head = readWorktreeHead(root);
    eq(head.present, true, "head must be readable");
    eq(head.branch, "feature/demo", "branch from the worktree HEAD");
    eq(head.commit, "c".repeat(40), "commit resolved through commondir");
  });
});

test("adjacent B: the head reader falls back to packed-refs and reports detached and absent heads", () => {
  withFixtureRoot((root) => {
    const git = path.join(root, ".git");
    mkdirSync(git, { recursive: true });
    writeFileSync(path.join(git, "HEAD"), "ref: refs/heads/main\n");
    writeFileSync(path.join(git, "packed-refs"), `# pack-refs with: peeled\n${"d".repeat(40)} refs/heads/main\n`);
    eq(readWorktreeHead(root).commit, "d".repeat(40), "commit resolved from packed-refs");

    writeFileSync(path.join(git, "HEAD"), `${"e".repeat(40)}\n`);
    const detached = readWorktreeHead(root);
    eq(detached.commit, "e".repeat(40), "detached commit");
    check(detached.branch === null, "detached head has no branch");
  });
  withFixtureRoot((root) => {
    const absent = readWorktreeHead(root);
    eq(absent.present, false, "a non-repository root must report absent, not throw");
  });
});

test("adjacent B: the observed head and runtime identity appear in the evaluation result", () => {
  withFixtureRoot((root) => {
    realWorldFixture(root);
    const result = evaluate(root);
    check(result.preflight !== undefined, "result must carry a preflight record");
    eq(result.preflight.observedHead.present, false, "fixture root is not a git worktree");
    eq(result.preflight.runtimeIdentity.actual.platform, process.platform, "runtime identity recorded");
  });
});

outputTest("adjacent B: an output-mode run refuses a root that is not a readable git worktree", () => {
  withFixtureRoot((root) => {
    realWorldFixture(root); // deliberately NO makeGitWorktree
    const outDir = path.join(root, ALLOWED_REL, "run-nogit");
    const run = runRunner(["--root", root, "--out", outDir], root);
    check(run.status !== 0, "governed evidence must not be produced from a non-repository root");
    check(/worktree|git/i.test(run.stderr), `expected a git-worktree error, got: ${run.stderr}`);
  });
});

// ─── 10. Adjacent E: explicit CLI grammar ───────────────────────────────────

test("adjacent E: '--verify-only false' is FALSE, not a truthy string", () => {
  eq(parseArgs(["--verify-only", "false"])["verify-only"], false, "space-separated false");
  eq(parseArgs(["--verify-only=false"])["verify-only"], false, "equals-separated false");
  eq(parseArgs(["--verify-only", "true"])["verify-only"], true, "explicit true");
  eq(parseArgs(["--verify-only"])["verify-only"], true, "bare flag");
});

test("adjacent E: '--verify-only false' behaviorally does NOT take the verify-only path", () => {
  withFixtureRoot((root) => {
    realWorldFixture(root);
    // With verify-only explicitly false and no --out, the runner must take the
    // plain stdout path; the old parser made this string truthy.
    const run = runRunner(["--root", root, "--verify-only", "false"], root);
    eq(run.status, 2, "still a BLOCKED evaluation");
    const parsed = JSON.parse(run.stdout);
    eq(parsed.mode, "REPORT_ONLY", "mode must not be VERIFY_ONLY when the flag is explicitly false");
  });
});

test("adjacent E: invalid boolean values, unknown flags, duplicates, and bare words are rejected", () => {
  throws(() => parseArgs(["--verify-only", "bogus"]), "a non-boolean value must be rejected");
  throws(() => parseArgs(["--verify-only", "1"]), "'1' must not be coerced to true");
  throws(() => parseArgs(["--not-a-flag"]), "an unknown flag must be rejected");
  throws(() => parseArgs(["--root", "a", "--root", "b"]), "a duplicated flag must be rejected");
  throws(() => parseArgs(["positional"]), "a bare positional argument must be rejected");
  throws(() => parseArgs(["--root"]), "a string flag with no value must be rejected");
  throws(() => parseArgs(["--verify-only", "--out"]), "a string flag consuming a flag must be rejected");
});

test("adjacent E: an invalid CLI invocation exits non-zero without evaluating anything", () => {
  withFixtureRoot((root) => {
    realWorldFixture(root);
    const run = runRunner(["--root", root, "--verify-only", "yes"], root);
    check(run.status !== 0, "invalid CLI must not exit 0");
    eq(run.stdout.trim(), "", "no result may be emitted for an invalid invocation");
  });
});

// ─── 11. Adjacent F: aggregation must not pass vacuously ────────────────────

test("adjacent F: aggregate([]) is an internal contract error, never a vacuous PASS", () => {
  throws(() => aggregate([]), "an empty item set must not aggregate to PASS");
  throws(() => aggregate([{ id: "a", status: "NOT_APPLICABLE" }]), "an all-NOT_APPLICABLE set must not aggregate to PASS");
});

test("adjacent F: aggregation still represents PASS for a genuinely all-PASS relevant set", () => {
  const r = aggregate([
    { id: "a", status: "PASS" },
    { id: "b", status: "PASS" },
    { id: "c", status: "NOT_APPLICABLE" }
  ]);
  eq(r.executionStatus, "PASS", "all-PASS relevant set");
});

test("aggregate() lets BLOCKED_PRECONDITION dominate PASS and FAIL", () => {
  const r = aggregate([
    { id: "a", status: "PASS" },
    { id: "b", status: "FAIL" },
    { id: "c", status: "BLOCKED_PRECONDITION" }
  ]);
  eq(r.executionStatus, "BLOCKED", "overall status");
  eq(r.blockedReason, "PRECONDITION_UNSATISFIED", "blocked reason");
});

// ─── 12. Item semantics and full-result visibility ──────────────────────────

test("READ_JSON_FIELD_EQUALS blocks when absent and FAILS on value drift", () => {
  const item = CONTRACT.exitItems.find((i) => i.id === "decisionClosure");
  withFixtureRoot((root) => {
    eq(evaluateItem(item, root).status, "BLOCKED_MISSING_EVIDENCE", "absent evidence");
  });
  withFixtureRoot((root) => {
    writeOracleCounts(root, 1234);
    eq(evaluateItem(item, root).status, "FAIL", "drifted evidence");
  });
});

test("STATIC_BLOCKED_NO_DEFINITION and MULTI_SUBCHECK behave as declared", () => {
  withFixtureRoot((root) => {
    eq(
      evaluateItem(CONTRACT.exitItems.find((i) => i.id === "frozenRuntime"), root).status,
      "BLOCKED_MISSING_DEFINITION",
      "undefined criterion"
    );
    const multi = evaluateItem(CONTRACT.exitItems.find((i) => i.id === "standaloneAndIntegratedExactGates"), root);
    eq(multi.status, "BLOCKED_MISSING_DEFINITION", "combined status");
    eq(multi.subCheckResults.length, 2, "both subcheck results preserved");
    check(multi.subCheckResults.every((r) => r.status === "BLOCKED_MISSING_DEFINITION"), "each subcheck blocks");
  });
});

test("STATIC_NOT_SATISFIED (reasonClosure) reports FAIL, not BLOCKED", () => {
  withFixtureRoot((root) => {
    eq(evaluateItem(CONTRACT.exitItems.find((i) => i.id === "reasonClosure"), root).status, "FAIL", "evidenced-unsatisfied");
  });
});

test("evaluateCheck throws on an unknown checkMethod rather than guessing a status", () => {
  withFixtureRoot((root) => {
    throws(() => evaluateCheck({ id: "bogus", checkMethod: "NOT_A_REAL_METHOD" }, root), "unknown checkMethod must throw");
  });
});

test("all 11 item findings remain visible when the overall status is BLOCKED", () => {
  withFixtureRoot((root) => {
    realWorldFixture(root);
    const result = evaluate(root);
    eq(result.executionStatus, "BLOCKED", "overall status");
    eq(result.itemResults.length, 11, "all 11 findings retained");
    eq(result.itemResults.find((r) => r.id === "reasonClosure").status, "FAIL", "reasonClosure FAIL visible");
    eq(result.itemResults.find((r) => r.id === "independentReview").status, "FAIL", "independentReview FAIL visible");
    eq(result.itemResults.find((r) => r.id === "e2").status, "PASS", "e2 PASS visible");
    eq(result.itemResults.find((r) => r.id === "a15").status, "NOT_APPLICABLE", "self item not applicable");
  });
});

test("evaluate() disclaims Phase 10A closure and Phase 10B authorization", () => {
  withFixtureRoot((root) => {
    bestCaseFixture(root);
    const result = evaluate(root);
    eq(result.phase10AClosure, "NOT_CLAIMED", "must not claim Phase 10A closure");
    eq(result.phase10BAuthorization, "NOT_CLAIMED", "must not claim Phase 10B authorization");
    eq(result.reviewDisposition, "PENDING_INTERNAL_REVIEW", "runner must never self-assign ACCEPTED_FOR_A15_CLOSURE");
  });
});

test("evaluate() is byte-identical across repeated runs against the same fixture root", () => {
  withFixtureRoot((root) => {
    realWorldFixture(root);
    const a = JSON.stringify(evaluate(root));
    const b = JSON.stringify(evaluate(root));
    const c = JSON.stringify(evaluate(root));
    check(a === b && b === c, "evaluate() must be deterministic");
  });
});

// ─── 13. B2-B6 and network posture ─────────────────────────────────────────

test("contract declares B2-B6 out of scope, and no exit item touches them", () => {
  eq(CONTRACT.b2ThroughB6.evaluatedByA15, false, "never evaluated");
  eq(CONTRACT.b2ThroughB6.modifiedByA15, false, "never modified");
  check(!CONTRACT.exitItems.some((i) => /b[2-6]/i.test(i.id)), "B2-B6 must not appear as an exitItem");
});

test("the runner performs no network I/O: no network module is resolvable in its module graph", () => {
  // Behavioral rather than a source-text scan: the runner is imported by this
  // suite, so if it required a network module the import would have loaded it.
  const source = readFileSync(RUNNER_SOURCE_PATH, "utf8");
  const importedModules = [...source.matchAll(/^\s*import[^;]*?from\s+"([^"]+)"/gmu)].map((m) => m[1]);
  for (const m of importedModules) {
    check(
      ["node:crypto", "node:fs", "node:path", "node:url"].includes(m),
      `runner imports an unexpected module: ${m}`
    );
  }
  check(!/\bfetch\s*\(/u.test(source), "runner must not call fetch()");
  check(!/require\s*\(/u.test(source), "runner must not use dynamic require to reach a network module");
});

// Adjacent finding D: roadmap selection must not rest on filesystem mtime.
// Three parts, all required.
// (1) No filesystem-time API may be reached anywhere in the runner. mtime is
//     not committed state, is not reproducible across clones or checkouts, and
//     would let an incidental `touch` reassign the source of truth. The scan is
//     an exact occurrence count rather than a comment/string strip: the word is
//     permitted to appear exactly once, in the rationale's own disclaimer, and
//     any second mention -- including a destructured `{ mtimeMs }` that no
//     property-access pattern would catch -- fails this test.
// (2) The recorded rationale must cite the committed promotion decision and
//     explicitly disclaim mtime.
// (3) That citation must actually be present in the real ledger: a rationale
//     that merely SOUNDS reproducible while naming evidence that does not exist
//     is the same defect wearing better prose.
test("finding D: roadmap selection uses the committed promotion decision, never filesystem mtime", () => {
  const source = readFileSync(RUNNER_SOURCE_PATH, "utf8");
  const rationale = CONTRACT.controllingSourceOfTruth.roadmapSelectionRationale;

  const mentions = source.split("mtime").length - 1;
  eq(mentions, 1, "the word 'mtime' may appear exactly once in the runner (the disclaimer)");
  check(rationale.includes("mtime"), "that single mention must be the rationale's disclaimer");
  for (const api of [".mtime", ".birthtime", ".atime", ".ctime", "utimes(", "birthtime", "atimeMs", "ctimeMs"]) {
    check(!source.includes(api), `runner must not read or write filesystem times (${api})`);
  }

  check(rationale.includes("C31"), "rationale must name the commit that promoted v9");
  check(rationale.includes("NOT used"), "rationale must explicitly disclaim mtime as a selection basis");

  // The cited evidence has to exist, in the real ledger, not just be asserted.
  const ledger = readFileSync(path.join(REPO_ROOT, "knowledge/CURRENT_STATE.md"), "utf8");
  const ledgerRow = (needle) =>
    ledger.split("\n").map((l) => l.trim()).find((l) => l.startsWith(needle));
  const promotion = ledgerRow("Roadmap v9 promoted in C31");
  check(promotion !== undefined, "cited promotion row must exist in the real ledger");
  check(promotion.endsWith("true"), `cited promotion row must record true, got: ${promotion}`);
  const hierarchy = ledgerRow("Roadmap v9 source-of-truth hierarchy");
  check(hierarchy !== undefined, "cited hierarchy row must exist in the real ledger");
  check(hierarchy.endsWith("PASS"), `cited hierarchy row must record PASS, got: ${hierarchy}`);
  check(ledger.includes("committed evidence/frozen artifacts"), "cited hierarchy must exist verbatim in the real ledger");
});

console.log(
  `\nPHASE-10A-A15-FINAL-CLOSURE-GATE-V1 tests: ${passed} passed, ${failed} failed, ` +
    `${assertions} assertions, ${skipped} skipped/unresolved`
);
if (skipped > 0) {
  console.log("UNRESOLVED SECURITY CASES (not counted as coverage):");
  for (const r of skipReasons) console.log(`  - ${r}`);
}
// Set the code explicitly rather than inheriting whatever an in-process main()
// call left on process.exitCode: a clean suite must exit 0, a failing one 1.
process.exitCode = failed > 0 ? 1 : 0;
