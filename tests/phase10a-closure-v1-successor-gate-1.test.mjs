// PHASE-10A-CLOSURE-V1-SUCCESSOR-GATE-1 - behavioral suite for
// evaluation/runner/phase10a-closure-v1/phase10a-a15-successor-gate.mjs.
//
// The successor closure gate makes two claims that would be dangerous if
// unverified: that V2 corrects the item-4/item-5 sequencing inversion, and that
// it nevertheless remains NOT_PASS_CAPABLE while NB2 has no separately
// authorized D8 admission mechanism. The coverage is deliberately balanced:
//
//   1. FORWARD-ONLY ADDITIVITY. A15 V1's bytes are pinned by digest and its
//      gate is re-run in-process; the successor must not have altered it, and
//      the imported semantics must still be the ones V1 actually implements.
//   2. FAIL-CLOSED STRUCTURE. Vacuous PASS refusal, unknown condition classes,
//      deep contract immutability, output-path confinement (including the
//      textual-prefix sibling and traversal cases), pre-existing evidence
//      directory refusal, and the derived-vs-declared PASS reachability proof.
//   3. TODAY'S HONEST VERDICT against the real repository: BLOCKED with exit
//      code 2; the owner's criteria-fidelity confirmation recorded in a separate
//      hash-pinned artifact and bound to the pinned criteria digest, clearing
//      that precondition without conferring any PASS; items 1-6 still short of
//      their own evidence; items 7/8 evaluated against the additive split rows
//      and failing on their recorded value, with the historical combined row
//      admitted only as diagnostic context; and Phase 10A NOT_CLAIMED.
//
// No network and no governed writes. Mutation fixtures are created only under
// OS temp directories and removed by the test that created them. The real gate
// is evaluated in REPORT_ONLY mode.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import * as S from "../evaluation/runner/phase10a-closure-v1/phase10a-a15-successor-gate.mjs";
import * as V1 from "../evaluation/runner/phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const V1_REL = "evaluation/runner/phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs";
// Digest of A15 V1 as committed at the authoring base commit
// 0de779cd529271b9235eba3a1e4a8b051bf4c987. This suite fails if the successor
// work unit ever edits V1, which is the whole point of a forward-only successor.
const V1_SHA = "07b4be961c631ac84c06cc8695e9afdc35f82eb3ce4ae8d0513bb6c64efd9033";
const V1_CRITERIA_REL = "evaluation/results/phase10a-closure-v1/PHASE10A_APPROVED_EXIT_CRITERIA_V1.json";
const V1_CRITERIA_SHA = "33d303d5bc46d524abb710a005c8d90471f1d0669c32ff10a6fd48bd91f6d045";
const V1_CONFIRMATION_REL =
  "evaluation/results/phase10a-closure-v1/OWNER_CRITERIA_FIDELITY_CONFIRMATION_V1.json";
const V1_CONFIRMATION_SHA = "f7dfa05ee89f5b1b53ca46dd790d09aac49b1ba7a57a77a3e5dc9be2c0d89e81";

const ALLOWED_OUT = "evaluation/results/phase10a-closure-v1";
const CRITERIA_REL = `${ALLOWED_OUT}/PHASE10A_APPROVED_EXIT_CRITERIA_V2.json`;
const CRITERIA_SHA = "b528eb2b6e88de676407af017e5c023ae69c130020520809e6620e2f49beacf6";
const CONFIRMATION_REL = `${ALLOWED_OUT}/OWNER_CRITERIA_FIDELITY_CONFIRMATION_V2.json`;
const CONFIRMATION_SHA = "96e8df286ecf7167ddb47402ba2cfc1d119e9e95cbc08d63c9e5ed40fadbaef9";
const INPUT_MANIFEST_REL = `${ALLOWED_OUT}/GOVERNANCE_INPUT_MANIFEST.sha256`;

let passed = 0, failed = 0, assertions = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }
function throws(fn, m) {
  assertions++;
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert(threw, m);
}
function abs(rel) { return path.join(REPO_ROOT, ...rel.split("/")); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function canonicalSha256(bytes) {
  const canonical = Buffer.from(bytes.toString("utf8").replace(/\r\n/gu, "\n"), "utf8");
  return sha256(canonical);
}
function byId(conditions, id) { return conditions.find((c) => c.id === id); }
function clone(value) { return structuredClone(value); }
function withTempRoot(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tina-phase10a-v2-qa-"));
  try { return fn(root); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function writeFixture(root, rel, bytes) {
  const target = path.join(root, ...rel.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  return target;
}
function dependencyGraph(items) {
  check(typeof S.validateDependencyGraph === "function", "runner exports validateDependencyGraph(items)");
  return S.validateDependencyGraph(items);
}
function topLevelRead(root, rel, options) {
  check(typeof S.topLevelRead === "function", "runner exports bounded topLevelRead(root, rel, options)");
  return S.topLevelRead(root, rel, options);
}

// One evaluation, reused: it is deterministic and read-only, and re-running it
// per test would only slow the suite down.
const RESULT = S.evaluate(REPO_ROOT);
const ITEM = (id) => {
  const found = RESULT.itemResults.find((r) => r.id === id);
  assert(found, `no item result '${id}'`);
  return found;
};
const CRITERIA = JSON.parse(fs.readFileSync(abs(CRITERIA_REL), "utf8"));
const GOVERNED = S.loadGovernedInputs(REPO_ROOT);
const ITEM4_CRITERIA = CRITERIA.criteria.standaloneAndIntegratedExactGates;

function exactGateFigures() {
  return Object.fromEntries(ITEM4_CRITERIA.exactGateSet.gateIds.map((id) => {
    const spec = ITEM4_CRITERIA.exactGateSet.gates[id];
    if (spec.kind === "RATIO") {
      const value = { numerator: spec.numerator, denominator: spec.denominator };
      if (spec.splitReportingRequired === true) {
        value.substantiveNumerator = spec.substantiveNumerator;
        value.substantiveDenominator = spec.substantiveDenominator;
      }
      return [id, value];
    }
    if (spec.kind === "VERDICT") return [id, { verdict: spec.expected }];
    return [id, { [spec.field]: spec.expected }];
  }));
}

function writeJsonRef(root, rel, value) {
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  writeFixture(root, rel, bytes);
  return { path: rel, sha256: canonicalSha256(bytes) };
}

function governedServicesFixture(root) {
  const paths = [...CRITERIA.frozenGovernedRuntimeSet.paths];
  const hash = createHash("sha256");
  for (const [index, rel] of paths.entries()) {
    const bytes = Buffer.from(`governed-${index}\r\nline\n`, "utf8");
    writeFixture(root, rel, bytes);
    hash.update(Buffer.from(bytes.toString("utf8").replace(/\r\n/gu, "\n"), "utf8"));
  }
  return { paths, digest: hash.digest("hex") };
}

function exactGateSubcheckFixture(root, sub, serviceIdentity) {
  const gates = exactGateFigures();
  const runtimeIdentity = {
    analyzerFilesDigest: "a".repeat(64),
    servicesTreeDigest: serviceIdentity.digest,
    servicesTreeFileSet: serviceIdentity.paths,
    servicesTreeDigestVerified: true
  };
  const invocationRecord = sub.mode === "INTEGRATED" ? {
    invocationPath: "IN_PROCESS_ASK_BOUNDARY",
    askEntrypoint: "/ask",
    harnessOnlyPath: false,
    inProcess: true,
    deployedStaging: false,
    externalNetworkUsed: false,
    analyzerUnderTestSubstituted: false
  } : null;
  const commonResult = {
    envelope: sub.envelope,
    mode: sub.mode,
    verdict: "EXACT",
    servicesTreeDigest: serviceIdentity.digest,
    gates
  };
  const stem = `item4/${sub.id}`;
  const a1 = writeJsonRef(root, `${stem}/A1.json`, {
    runtimeIdentity,
    servicesTreeDigest: serviceIdentity.digest
  });
  const a2 = writeJsonRef(root, `${stem}/A2.json`, { ...commonResult, attemptId: `${sub.id}-campaign` });
  const a3 = writeJsonRef(root, `${stem}/A3.json`, { rows: Array.from({ length: 3720 }, () => null) });
  const a4 = writeJsonRef(root, `${stem}/A4.json`, {
    ...commonResult,
    attemptId: `${sub.id}-lock`,
    clean: true
  });
  const requiredArtifacts = { A1: a1, A2: a2, A3: a3, A4: a4 };
  if (sub.mode === "INTEGRATED") {
    requiredArtifacts.A5 = writeJsonRef(root, `${stem}/A5.json`, {
      invocationPath: invocationRecord.invocationPath,
      invocationRecord,
      runtimeIdentity
    });
  }
  const artifact = {
    ...commonResult,
    semantics: "EXACT_SET_EQUALITY",
    counts: { totalRows: 3720, exactRows: 3720, mismatchRows: 0 },
    runtimeIdentity,
    ...(invocationRecord === null ? {} : { invocationRecord }),
    requiredArtifacts,
    aggregateRecomputation: {
      a3Sha256: a3.sha256,
      rowsRecomputed: 3720,
      gates: { G1: gates.G1, G2: gates.G2, G3: gates.G3 }
    },
    lockVerification: {
      separateCleanRun: true,
      reproducedA2: true,
      servicesTreeDigest: serviceIdentity.digest
    },
    antiCircularity: {
      clause: ITEM4_CRITERIA.antiCircularity.clause,
      expectationFittingUsed: false,
      satisfiedByAlternative: "i",
      alternativeEvidence: a1
    }
  };
  const evidenceSource = `${stem}/envelope.json`;
  writeJsonRef(root, evidenceSource, artifact);
  return { artifact, evidenceSource };
}

// ---------------------------------------------------------------------------
// 1. Forward-only additivity
// ---------------------------------------------------------------------------

test("A15 V1 is byte-identical to its committed form", () => {
  const bytes = fs.readFileSync(abs(V1_REL));
  check(
    createHash("sha256").update(bytes).digest("hex") === V1_SHA,
    "A15 V1 must not be modified by the successor work unit"
  );
  check(sha256(fs.readFileSync(abs(V1_CRITERIA_REL))) === V1_CRITERIA_SHA, "V1 criteria bytes unchanged");
  check(
    sha256(fs.readFileSync(abs(V1_CONFIRMATION_REL))) === V1_CONFIRMATION_SHA,
    "V1 fidelity-confirmation bytes unchanged"
  );
});

test("A15 V1 remains independently runnable and unchanged in verdict", () => {
  const v1 = V1.evaluate(REPO_ROOT);
  check(v1.contractIdentity === "PHASE-10A-A15-FINAL-CLOSURE-GATE-V1", "V1 identity intact");
  check(v1.executionStatus === "BLOCKED", "V1 still blocks");
  check(
    V1.CONTRACT.passReachability.status === "REQUIRES_FUTURE_CONTRACT_REVISION",
    "V1 still declares itself not pass-capable; the successor is what supplies the catalogue"
  );
});

test("the successor declares additive supersession of V1", () => {
  check(S.SUCCESSOR_CONTRACT.identity === "PHASE-10A-A15-SUCCESSOR-CLOSURE-GATE-V1", "successor identity");
  check(S.SUCCESSOR_CONTRACT.supersedes.mode === "FORWARD_ONLY_ADDITIVE", "additive mode declared");
  check(S.SUCCESSOR_CONTRACT.supersedes.v1Modified === false, "declares V1 unmodified");
  check(RESULT.supersedes.v1Modified === false, "reports V1 unmodified");
  check(
    RESULT.supersedes.v1ContractIdentityObserved === V1.CONTRACT.identity,
    "records the V1 identity it actually observed rather than the one it expected"
  );
});

test("imported V1 semantics are the ones V1 actually exports", () => {
  for (const name of [
    "isContained", "parseLedgerTable", "selectLedgerRow", "verifyEvidenceManifest",
    "extractVerdict", "evaluateCheck", "aggregate", "exitCodeFor", "parseArgs",
    "runtimeIdentity", "readWorktreeHead"
  ]) {
    check(typeof V1[name] === "function", `V1 exports ${name}()`);
  }
  check(S.assertPrecedenceConsistentWithV1() === true, "status precedence agrees with V1's aggregate() behaviourally");
});

test("the status vocabulary is derived from V1, not re-declared", () => {
  const published = V1.CONTRACT.statusVocabulary.itemStatus;
  const derived = Object.keys(S.ITEM_STATUS);
  check(derived.length === published.length, "same number of statuses as V1 publishes");
  check(derived.every((s) => published.includes(s)), "every successor status is one V1 publishes");
  check(published.every((s) => derived.includes(s)), "every V1 status is handled by the successor");
});

// ---------------------------------------------------------------------------
// 2. Fail-closed structure
// ---------------------------------------------------------------------------

test("an empty condition list is refused rather than passed", () => {
  throws(() => S.statusFromConditions([], "synthetic"), "no vacuous PASS from an empty condition list");
  throws(
    () => S.statusFromConditions([{ id: "x", class: "BOGUS", satisfied: false, detail: "d" }], "synthetic"),
    "an unclassifiable unmet condition is an internal error, not a status guess"
  );
});

test("condition class decides the blocked status, highest precedence first", () => {
  const mk = (klass, satisfied) => ({ id: klass, class: klass, satisfied, detail: klass });
  check(
    S.statusFromConditions([mk("PRECONDITION", false), mk("CONTENT", false)], "t").status === "BLOCKED_PRECONDITION",
    "a missing precondition is never reported as a content failure"
  );
  check(
    S.statusFromConditions([mk("EVIDENCE_PRESENCE", false), mk("CONTENT", false)], "t").status ===
      "BLOCKED_MISSING_EVIDENCE",
    "missing evidence dominates a content failure derived from the absent evidence"
  );
  check(S.statusFromConditions([mk("CONTENT", false)], "t").status === "FAIL", "a pure content failure is a FAIL");
  check(S.statusFromConditions([mk("CONTENT", true)], "t").status === "PASS", "all conditions met is a PASS");
});

test("the contract is deeply frozen", () => {
  throws(() => { "use strict"; S.SUCCESSOR_CONTRACT.exitItems[0].checkMethod = "TAMPERED"; }, "nested mutation refused");
  throws(() => { "use strict"; S.SUCCESSOR_CONTRACT.passReachability.status = "PASS"; }, "reachability mutation refused");
});

test("output paths are confined structurally to the successor's own tree", () => {
  S.assertWritePathAllowed(abs(`${ALLOWED_OUT}/EXEC_1`), REPO_ROOT);
  S.assertWritePathAllowed(abs(ALLOWED_OUT), REPO_ROOT);
  assertions += 2;
  throws(() => S.assertWritePathAllowed(abs(`${ALLOWED_OUT}-evil`), REPO_ROOT), "textual-prefix sibling rejected");
  throws(
    () => S.assertWritePathAllowed(abs(`${ALLOWED_OUT}/../../../etc`), REPO_ROOT),
    "traversal out of the allowlisted tree rejected"
  );
  throws(
    () => S.assertWritePathAllowed(abs("evaluation/results/phase-10a-a15-closure-gate"), REPO_ROOT),
    "A15 V1's own output tree is not writable from the successor"
  );
  throws(() => S.assertWritePathAllowed(path.resolve("/"), REPO_ROOT), "filesystem root rejected");
});

test("an evidence-producing run refuses to overwrite or to escape", () => {
  const swallow = { write() {} };
  // Captured before the refusals so the assertion measures "nothing changed"
  // rather than a hardcoded inventory that rots as governance artifacts are added.
  const before = fs.readdirSync(abs(ALLOWED_OUT)).sort().join(",");
  throws(() => S.main(["--out", ALLOWED_OUT], swallow), "refuses a pre-existing evidence directory");
  throws(
    () => S.main(["--out", "evaluation/results/ELSEWHERE"], swallow),
    "refuses an output directory outside the allowlisted tree"
  );
  // Neither refusal may leave anything behind.
  const after = fs.readdirSync(abs(ALLOWED_OUT)).sort().join(",");
  check(after === before, `refused runs wrote nothing; before: ${before}; after: ${after}`);
  check(!fs.existsSync(abs("evaluation/results/ELSEWHERE")), "no directory created outside the allowlist");
});

test("read and output containment reject a junction that escapes the evaluated root", () => {
  withTempRoot((base) => {
    const root = path.join(base, "root");
    const outside = path.join(base, "outside");
    fs.mkdirSync(root, { recursive: true });
    fs.mkdirSync(outside, { recursive: true });
    writeFixture(outside, "A1.json", Buffer.from('{"runtimeIdentity":{"servicesTreeDigest":"outside"}}\n'));

    const link = path.join(root, "evaluation", "results", "phase10a-closure-v1", "escape");
    fs.mkdirSync(path.dirname(link), { recursive: true });
    try {
      fs.symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
    } catch (e) {
      if (["EPERM", "EACCES", "UNKNOWN"].includes(e?.code)) {
        console.log(`SKIP junction containment regression: OS refused link creation (${e.code})`);
        return;
      }
      throw e;
    }

    throws(
      () => S.assertWritePathAllowed(path.join(link, "output"), root),
      "a lexical child whose real path escapes cannot be an allowed output"
    );

    const sub = { id: "standalone", requiredArtifacts: ["A1"] };
    const rel = "evaluation/results/phase10a-closure-v1/escape/A1.json";
    const bytes = fs.readFileSync(path.join(link, "A1.json"));
    const states = S.requiredArtifactStates(
      { requiredArtifacts: { A1: { path: rel, sha256: canonicalSha256(bytes) } } },
      sub,
      GOVERNED,
      root
    );
    const a1 = states.get("A1");
    check(a1.state.escaped === true, "junction target outside the root is classified as escaped");
    check(a1.verified === false, "bytes reached through an escaping junction are never verified");
  });
});

test("dependency graph rejects unknown dependencies without evaluating them", () => {
  const result = dependencyGraph([{ id: "a", dependsOnItems: ["missing"] }]);
  check(result.status === "BLOCKED_PRECONDITION", `unknown dependency blocks (got ${result.status})`);
  check(result.safePauseRequired === true, "unknown dependency requires SAFE_PAUSE");
  check(result.issues.some((i) => i.code === "UNKNOWN_DEPENDENCY"), "unknown dependency is identified");
});

test("dependency graph rejects self, two-node and three-node cycles without recursion", () => {
  for (const [label, items] of [
    ["self", [{ id: "a", dependsOnItems: ["a"] }]],
    ["two-node", [{ id: "a", dependsOnItems: ["b"] }, { id: "b", dependsOnItems: ["a"] }]],
    ["three-node", [
      { id: "a", dependsOnItems: ["b"] },
      { id: "b", dependsOnItems: ["c"] },
      { id: "c", dependsOnItems: ["a"] }
    ]]
  ]) {
    const result = dependencyGraph(items);
    check(result.status === "BLOCKED_PRECONDITION", `${label} cycle blocks`);
    check(result.safePauseRequired === true, `${label} cycle requires SAFE_PAUSE`);
    check(
      result.issues.some((i) => i.code === (label === "self" ? "SELF_CYCLE" : "DEPENDENCY_CYCLE")),
      `${label} cycle is identified`
    );
  }
});

test("dependency graph handles a 15001-node acyclic chain without stack overflow", () => {
  const items = Array.from({ length: 15001 }, (_, i) => ({
    id: `n${i}`,
    dependsOnItems: i === 0 ? [] : [`n${i - 1}`]
  }));
  let result;
  try { result = dependencyGraph(items); }
  catch (e) { check(false, `deep dependency validation must not throw: ${e.message}`); }
  check(result.safePauseRequired === false, "a deep but valid acyclic graph does not SAFE_PAUSE");
});

test("dependency graph budget exhaustion on more than 20000 edges blocks fail-closed", () => {
  const deps = Array.from({ length: 20001 }, (_, i) => `n${i}`);
  const items = [{ id: "root", dependsOnItems: deps }, ...deps.map((id) => ({ id, dependsOnItems: [] }))];
  const result = dependencyGraph(items);
  check(result.budgetExhausted === true, "wide dependency scan reports budget exhaustion");
  check(result.status === "BLOCKED_PRECONDITION", "budget exhaustion blocks");
  check(result.safePauseRequired === true, "an incomplete dependency scan requires SAFE_PAUSE");
});

test("later-stage key scan is iterative at depth and fail-closed on width", () => {
  const deep = {};
  let cursor = deep;
  for (let i = 0; i < 15001; i++) {
    cursor.next = {};
    cursor = cursor.next;
  }
  let deepScan;
  try { deepScan = S.laterStageKeysIn(deep); }
  catch (e) { check(false, `15001-deep key scan must not throw: ${e.message}`); }
  check(deepScan.complete === true, "15001-deep scan completes within the declared budget");
  check(deepScan.keys.length === 0, "deep legitimate document has no later-stage key");

  const wide = Object.fromEntries(Array.from({ length: 20001 }, (_, i) => [`k${i}`, null]));
  const wideScan = S.laterStageKeysIn(wide);
  check(wideScan.complete === false, "more than 20000 keys exhaust the scan budget");
  const outcome = S.statusFromConditions(
    S.sequencingInversionConditions(wide, { stage: "PRE_FREEZE" }, "wide"),
    "wide"
  );
  check(outcome.status !== "PASS", "budget exhaustion cannot be interpreted as a clean scan");
});

test("nested camel, snake and kebab later-stage keys are detected even when null", () => {
  for (const [label, artifact] of [
    ["camel", { nested: { freezeManifestSha256: null } }],
    ["snake", { nested: { post_freeze_campaign_id: null } }],
    ["kebab", { nested: { "staging-attribution": null } }],
    ["frozen commit", { nested: [{ frozenCommit: null }] }]
  ]) {
    const conditions = S.sequencingInversionConditions(artifact, { stage: "PRE_FREEZE" }, label);
    const inversion = byId(conditions, `${label}.sequencing.noLaterStageEvidenceFields`);
    check(inversion?.satisfied === false, `${label} key is a sequencing inversion`);
    check(inversion?.safePauseRequired === true, `${label} inversion requires SAFE_PAUSE`);
  }
  const legitimate = S.laterStageKeysIn({ preFreezeNote: "legitimate", freezeDriedFood: true });
  check(legitimate.complete === true && legitimate.keys.length === 0, "legitimate preFreeze words are not flagged");
});

test("top-level and A1-A5 input reads enforce configurable byte bounds", () => {
  withTempRoot((root) => {
    writeFixture(root, "small.json", Buffer.alloc(65, 0x20));
    for (const kind of ["TOP_LEVEL_ENVELOPE", "REQUIRED_ARTIFACT"]) {
      const read = topLevelRead(root, "small.json", { kind, maxBytes: 64 });
      check(read.ok === false, `${kind} rejects an input above its byte bound`);
      check(read.reasonCode === "INPUT_TOO_LARGE", `${kind} reports the size-limit reason`);
      check(read.bytes === null, `${kind} retains no oversized bytes`);
    }
  });
});

test("D3 provenance and NB2 keep pass reachability truthful until separately governed mechanisms exist", () => {
  const derived = S.computePassReachability();
  check(derived.currentCheckCatalogueCanProducePass === false, "D3 provenance and NB2 prevent an end-to-end PASS today");
  const blockers = new Set(derived.itemsThatCannotCurrentlyProducePass);
  check(
    blockers.size === 2 &&
      blockers.has("standaloneAndIntegratedExactGates") &&
      blockers.has("postFreezeEvidence"),
    `Item4 (D3) and Item6 (NB2) are the non-pass-capable items: ${derived.itemsThatCannotCurrentlyProducePass.join(", ")}`
  );
  check(S.SUCCESSOR_CONTRACT.passReachability.status === "NOT_PASS_CAPABLE", "contract declaration matches D3/NB2");
  check(S.assertPassReachabilityMatchesContract() === true, "declaration is proven against the catalogue, not asserted");
});

test("the exit-code contract keeps BLOCKED distinct from PASS and FAIL", () => {
  check(V1.EXIT_CODES.PASS === 0 && V1.EXIT_CODES.FAIL === 1 && V1.EXIT_CODES.BLOCKED === 2, "exit code triple");
  check(V1.exitCodeFor("BLOCKED") === 2, "BLOCKED never collapses to 0");
  check(V1.exitCodeFor(RESULT.executionStatus) === 2, "today's run exits 2");
});

// ---------------------------------------------------------------------------
// 3. Contract / criteria agreement
// ---------------------------------------------------------------------------

test("the catalogue covers all eleven roadmap items exactly once", () => {
  const items = S.SUCCESSOR_CONTRACT.exitItems;
  check(items.length === 11, `eleven exit items (found ${items.length})`);
  const roadmap = items.map((i) => i.roadmapItem).sort((a, b) => a - b);
  check(roadmap.join(",") === "1,2,3,4,5,6,7,8,9,10,11", `roadmap items 1-11 once each: ${roadmap.join(",")}`);
  check(new Set(items.map((i) => i.id)).size === 11, "item ids are unique");
});

test("item 4 is one criterion with two mandatory subchecks", () => {
  const item = S.SUCCESSOR_CONTRACT.exitItems.find((i) => i.roadmapItem === 4);
  check(item.structure === "ONE_CRITERION_TWO_MANDATORY_SUBCHECKS", "D2 structure declared");
  check(item.subChecks.length === 2, "exactly two subchecks");
  check(item.subChecks.map((s) => s.id).join(",") === "standalone,integrated", "standalone and integrated");
  check(item.subChecks.find((s) => s.id === "integrated").stagingAttributionRequired === false,
    "the integrated subcheck carries no later-stage staging attribution");
  check(item.subChecks.find((s) => s.id === "integrated").invocationPath === "IN_PROCESS_ASK_BOUNDARY",
    "4b enters the local in-process /ask boundary");
  const result = ITEM("standaloneAndIntegratedExactGates");
  check(result.subCheckResults.length === 2, "both subchecks are evaluated, not short-circuited");
});

test("the exact stage matrix agrees between contract and V2 criteria", () => {
  const expected = new Map([[1, "POST_FREEZE"], [2, "POST_FREEZE"], [3, "POST_FREEZE"], [4, "PRE_FREEZE"], [5, "FREEZE"], [6, "POST_FREEZE"]]);
  for (const [roadmapItem, stage] of expected) {
    const item = S.SUCCESSOR_CONTRACT.exitItems.find((entry) => entry.roadmapItem === roadmapItem);
    const criterion = CRITERIA.criteria[item.criterionId ?? item.id];
    check(item.stage === stage, `contract item ${roadmapItem} stage is ${stage} (got ${item.stage})`);
    check(criterion.phase === stage, `criteria item ${roadmapItem} phase is ${stage}`);
    check(CRITERIA.sequencingModel.itemStage[String(roadmapItem)] === stage,
      `criteria sequencing model item ${roadmapItem} is ${stage}`);
    const conditions = S.contractSequencingConditions(item, GOVERNED);
    check(conditions.every((c) => c.satisfied), `item ${roadmapItem} contract/criteria sequencing agrees`);
  }
});

test("freeze-derived classification forbids an early-stage criterion and SAFE_PAUSEs", () => {
  const item = clone(S.SUCCESSOR_CONTRACT.exitItems.find((entry) => entry.roadmapItem === 4));
  const gi = { ...GOVERNED, criteria: clone(GOVERNED.criteria) };
  gi.criteria.criteria[item.criterionId].phase = "PRE_FREEZE";
  gi.criteria.sequencingModel.itemStage[String(item.roadmapItem)] = "PRE_FREEZE";
  gi.criteria.sequencingModel.itemRequiresFreezeDerivedEvidence[String(item.roadmapItem)] = true;
  const conditions = S.contractSequencingConditions(item, gi);
  const classification = byId(conditions, "sequencing.freezeDerivedEvidenceStageCompatible");
  check(classification !== undefined, "freeze-derived classification is an executable contract condition");
  check(classification.satisfied === false, "PRE_FREEZE plus requiresFreezeDerivedEvidence=true is rejected");
  check(classification.safePauseRequired === true, "the unreachable classification requires SAFE_PAUSE");
  const outcome = S.statusFromConditions(conditions, "mutated-stage");
  check(outcome.status === "BLOCKED_PRECONDITION", `classification blocks as a precondition (got ${outcome.status})`);
});

test("pinned criteria content reveals later-stage dependencies even when advisory flags stay false", () => {
  const baseItem = clone(S.SUCCESSOR_CONTRACT.exitItems.find((entry) => entry.roadmapItem === 4));
  const integrated = baseItem.subChecks.find((sub) => sub.id === "integrated");
  for (const field of [
    "stagingAttributionRequired",
    "freezeManifestReferenceRequired",
    "postFreezeCampaignRequired",
    "deployedStagingRequired"
  ]) {
    check(integrated[field] === false, `live contract flag ${field} remains false in the mutation baseline`);
  }

  const outcomeFor = (mutateCriteria) => {
    const gi = { ...GOVERNED, criteria: clone(GOVERNED.criteria) };
    const criterion = gi.criteria.criteria[baseItem.criterionId];
    gi.criteria.sequencingModel.itemRequiresFreezeDerivedEvidence[String(baseItem.roadmapItem)] = false;
    mutateCriteria(criterion);
    const conditions = S.contractSequencingConditions(baseItem, gi);
    return { conditions, outcome: S.statusFromConditions(conditions, "criteria-content-inversion") };
  };

  const mutations = [
    ["exact V1 positive requirement wording", (criterion) => {
      check(criterion.subChecks.integrated.freezeManifestReferenceRequired === false,
        "V1 wording mutation leaves the structured freeze flag false");
      check(criterion.subChecks.integrated.postFreezeCampaignRequired === false,
        "V1 wording mutation leaves the structured post-freeze flag false");
      criterion.requires.push("each references the freeze manifest by digest and a post-freeze campaign");
    }],
    ["positive requirement-context noun phrase", (criterion) => {
      check(criterion.subChecks.integrated.stagingAttributionRequired === false,
        "requirement-context mutation leaves the structured staging flag false");
      check(criterion.subChecks.integrated.deployedStagingRequired === false,
        "requirement-context mutation leaves the structured deployment flag false");
      criterion.requires.push("staging attribution to frozen commit");
    }],
    ["top-level requires text", (criterion) => {
      criterion.requires.push("4b requires freezeManifestReference and a postFreeze campaign");
    }],
    ["known 4b structured flags", (criterion) => {
      criterion.subChecks.integrated.freezeManifestReferenceRequired = true;
      criterion.subChecks.integrated.postFreezeCampaignRequired = true;
      criterion.subChecks.integrated.deployedStagingRequired = true;
    }],
    ["nested deployed-staging boundary", (criterion) => {
      criterion.subChecks.integrated.boundary.deployedStagingRequired = true;
    }],
    ["unknown later-stage requirement key", (criterion) => {
      criterion.subChecks.integrated.requiresPostFreezeDeploymentArtifact = true;
    }]
  ];

  const bypasses = [];
  for (const [label, mutate] of mutations) {
    const { conditions, outcome } = outcomeFor(mutate);
    const safePause = conditions.some((condition) => condition.safePauseRequired === true && !condition.satisfied);
    if (outcome.status !== "BLOCKED_PRECONDITION" || !safePause) {
      bypasses.push(`${label}: status=${outcome.status}, safePause=${safePause}`);
    }
  }
  const negative = outcomeFor((criterion) => {
    criterion.requires.push(
      "neither subcheck requires a freeze manifest, post-freeze campaign, or staging attribution to a frozen commit"
    );
  });
  check(negative.outcome.status === "PASS",
    `explicitly negative/prohibitive wording is not an inversion (got ${negative.outcome.status})`);
  check(!negative.conditions.some((condition) => !condition.satisfied && condition.safePauseRequired === true),
    "negative/prohibitive later-stage terminology does not request SAFE_PAUSE");
  check(
    bypasses.length === 0,
    `criteria-derived later-stage requirements must BLOCKED_PRECONDITION + SAFE_PAUSE; bypasses: ${bypasses.join(" | ")}`
  );
});

test("the final V2 digest chain and governance manifest bind the verified bytes", () => {
  check(sha256(fs.readFileSync(abs(CRITERIA_REL))) === CRITERIA_SHA, "criteria bytes have the finalized digest");
  check(sha256(fs.readFileSync(abs(CONFIRMATION_REL))) === CONFIRMATION_SHA, "confirmation bytes have the finalized digest");
  check(S.SUCCESSOR_CONTRACT.governedInputs.approvedCriteria.path === CRITERIA_REL, "runner pins V2 criteria path");
  check(S.SUCCESSOR_CONTRACT.governedInputs.approvedCriteria.sha256 === CRITERIA_SHA, "runner pins final V2 criteria digest");
  check(
    S.SUCCESSOR_CONTRACT.governedInputs.ownerCriteriaFidelityConfirmation.path === CONFIRMATION_REL,
    "runner pins V2 confirmation path"
  );
  check(
    S.SUCCESSOR_CONTRACT.governedInputs.ownerCriteriaFidelityConfirmation.sha256 === CONFIRMATION_SHA,
    "runner pins final V2 confirmation digest"
  );
  const confirmation = JSON.parse(fs.readFileSync(abs(CONFIRMATION_REL), "utf8"));
  check(confirmation.confirms.criteriaSha256 === CRITERIA_SHA, "confirmation binds the final criteria digest");

  const entries = fs.readFileSync(abs(INPUT_MANIFEST_REL), "utf8")
    .trim().split(/\r?\n/u)
    .map((line) => line.trim().split(/\s+/u))
    .map(([digest, rel]) => ({ digest, rel }));
  for (const [rel, digest] of [[CRITERIA_REL, CRITERIA_SHA], [CONFIRMATION_REL, CONFIRMATION_SHA]]) {
    const entry = entries.find((candidate) => candidate.rel === rel);
    check(entry?.digest === digest, `governance input manifest lists ${rel} at its final digest`);
    check(sha256(fs.readFileSync(abs(rel))) === entry?.digest, `${rel} manifest entry rehashes`);
  }
  check(V1.verifyEvidenceManifest(REPO_ROOT, INPUT_MANIFEST_REL).ok === true, "governance input manifest verifies end to end");
});

test("contract evidence sources agree with the committed approved criteria", () => {
  for (const item of S.SUCCESSOR_CONTRACT.exitItems) {
    const key = item.criterionId ?? null;
    if (key === null) continue;
    const entry = CRITERIA.criteria[key];
    check(entry !== undefined, `approved criteria carry an entry for '${key}'`);
    check(Number(entry.roadmapItem) === item.roadmapItem, `${key} roadmap item agrees`);
    if (item.evidenceSource !== undefined || entry.evidenceSource !== undefined) {
      check(item.evidenceSource === entry.evidenceSource, `${key} evidence source agrees`);
    }
  }
});

test("the anti-circularity clause is carried verbatim from D3", () => {
  check(
    S.SUCCESSOR_CONTRACT.antiCircularity.clause ===
      "Expectation-fitting to previously observed analyzer behavior is development evidence only and cannot establish closure.",
    "D3 clause verbatim in the contract"
  );
  check(CRITERIA.antiCircularityClause.mandatory === true, "the approved criteria make the clause mandatory");
  check(CRITERIA.antiCircularityClause.source === "D3", "sourced to D3");
  check(S.SUCCESSOR_CONTRACT.antiCircularity.clause === CRITERIA.antiCircularityClause.text,
    "the contract and the approved criteria carry the same clause verbatim");
});

test("the freeze covers the full 26-file governed runtime set (D5)", () => {
  check(S.SUCCESSOR_CONTRACT.frozenGovernedRuntimeSet.expectedFileCount === 26, "26 files");
  check(CRITERIA.frozenGovernedRuntimeSet.paths.length === 26, "criteria enumerate 26 paths");
  check(
    S.SUCCESSOR_CONTRACT.frozenGovernedRuntimeSet.digestBasis === "SHA256_OF_COMMITTED_BLOB_AT_FROZEN_COMMIT",
    "digests are taken over committed blob bytes, not working-tree bytes"
  );
  check(
    S.SUCCESSOR_CONTRACT.frozenGovernedRuntimeSet.digestReuseFromWs1Prohibited === true,
    "WS1 digests may not be reused as a Phase-10A freeze"
  );
  check(S.SUCCESSOR_CONTRACT.stagingIdentity.productionInScope === false, "production is out of scope (D6)");
});

test("P1 requires the declared standalone and integrated subcheck ids exactly once", () => {
  const freeze = S.SUCCESSOR_CONTRACT.exitItems.find((item) => item.roadmapItem === 5);
  const item4 = S.SUCCESSOR_CONTRACT.exitItems.find((item) => item.roadmapItem === 4);
  const contextFor = (subCheckResults) => ({
    itemOf: () => item4,
    statusOf: () => ({
      status: "PASS",
      cycle: false,
      outcome: { status: "PASS", subCheckResults }
    })
  });

  const duplicate = S.freezePreconditionP1Conditions(
    freeze,
    contextFor([{ id: "standalone", status: "PASS" }, { id: "standalone", status: "PASS" }]),
    "freeze"
  );
  const exact = S.freezePreconditionP1Conditions(
    freeze,
    contextFor([{ id: "standalone", status: "PASS" }, { id: "integrated", status: "PASS" }]),
    "freeze"
  );
  check(
    byId(duplicate, "freeze.P1.standaloneAndIntegratedExactGates.bothSubchecksPass")?.satisfied === false,
    "two PASS records for the same subcheck cannot discharge P1"
  );
  check(
    byId(exact, "freeze.P1.standaloneAndIntegratedExactGates.bothSubchecksPass")?.satisfied === true,
    "one PASS for each declared subcheck discharges the subcheck portion of P1"
  );
});

test("A1 is bound to its digest-verified runtime identity and services tree digest", () => {
  withTempRoot((root) => {
    const rel = "A1.json";
    const a1Doc = {
      runtimeIdentity: { analyzerFilesDigest: "a".repeat(64), servicesTreeDigest: "b".repeat(64) }
    };
    const bytes = Buffer.from(`${JSON.stringify(a1Doc)}\n`);
    writeFixture(root, rel, bytes);
    const sub = { id: "standalone", evidenceSource: "envelope.json", requiredArtifacts: ["A1"] };
    const envelope = {
      runtimeIdentity: { analyzerFilesDigest: "c".repeat(64), servicesTreeDigest: "d".repeat(64) },
      requiredArtifacts: { A1: { path: rel, sha256: canonicalSha256(bytes) } }
    };
    const states = S.requiredArtifactStates(envelope, sub, GOVERNED, root);
    const conditions = S.requiredArtifactConditions(envelope, sub, "a1", GOVERNED, root, states);
    const binding = byId(conditions, "a1.requiredArtifact.A1.runtimeIdentityMatchesEnvelope");
    check(binding !== undefined, "A1 exact-byte runtime identity binding is enforced");
    check(binding.satisfied === false, "contradictory A1 runtimeIdentity cannot pass");
    check(
      byId(conditions, "a1.requiredArtifact.A1.servicesTreeDigestMatchesRecomputed")?.satisfied === false,
      "A1 servicesTreeDigest must also match the independently recomputed value"
    );
  });
});

test("A5 exact verified bytes bind the integrated invocation and runtime identity", () => {
  withTempRoot((root) => {
    const rel = "A5.json";
    const a5Doc = {
      invocationRecord: {
        invocationPath: "HARNESS_DIRECT",
        mode: "STANDALONE",
        inProcess: false,
        deployedStaging: true,
        externalNetworkUsed: true,
        analyzerUnderTestSubstituted: true
      },
      runtimeIdentity: { analyzerFilesDigest: "0".repeat(64), servicesTreeDigest: "1".repeat(64) }
    };
    const bytes = Buffer.from(`${JSON.stringify(a5Doc)}\n`);
    writeFixture(root, rel, bytes);
    const sub = S.SUCCESSOR_CONTRACT.exitItems.find((item) => item.roadmapItem === 4)
      .subChecks.find((candidate) => candidate.id === "integrated");
    const envelope = {
      mode: "INTEGRATED",
      invocationRecord: {
        invocationPath: "IN_PROCESS_ASK_BOUNDARY",
        askEntrypoint: "/ask",
        harnessOnlyPath: false,
        inProcess: true,
        deployedStaging: false,
        externalNetworkUsed: false,
        analyzerUnderTestSubstituted: false
      },
      runtimeIdentity: { analyzerFilesDigest: "2".repeat(64), servicesTreeDigest: "3".repeat(64) },
      requiredArtifacts: { A5: { path: rel, sha256: canonicalSha256(bytes) } }
    };
    const narrowSub = { ...sub, requiredArtifacts: ["A5"] };
    const states = S.requiredArtifactStates(envelope, narrowSub, GOVERNED, root);
    const conditions = S.requiredArtifactConditions(envelope, narrowSub, "a5", GOVERNED, root, states);
    const binding = byId(conditions, "a5.requiredArtifact.A5.invocationMatchesEnvelope");
    check(binding !== undefined, "A5 invocation record is compared from digest-verified bytes");
    check(binding.satisfied === false, "dummy contradictory A5 invocation cannot pass");
    check(
      byId(conditions, "a5.requiredArtifact.A5.runtimeIdentityMatchesEnvelope")?.satisfied === false,
      "A5 runtime identity must match the envelope exactly"
    );
  });
});

test("cross-subcheck identity equality covers services and analyzer digests", () => {
  const standalone = {
    runtimeIdentity: { analyzerFilesDigest: "a".repeat(64), servicesTreeDigest: "b".repeat(64) }
  };
  const integrated = {
    runtimeIdentity: { analyzerFilesDigest: "a".repeat(64), servicesTreeDigest: "c".repeat(64) }
  };
  const mismatch = S.runtimeIdentityEqualityConditions(integrated, standalone, "cross");
  check(byId(mismatch, "cross.runtimeIdentity.equalsStandalone")?.satisfied === true,
    "matching analyzerFilesDigest is recognized");
  check(byId(mismatch, "cross.runtimeIdentity.servicesTreeDigestEqualsStandalone")?.satisfied === false,
    "different servicesTreeDigest prevents cross-subcheck equality");

  integrated.runtimeIdentity.servicesTreeDigest = standalone.runtimeIdentity.servicesTreeDigest;
  const exact = S.runtimeIdentityEqualityConditions(integrated, standalone, "cross");
  check(
    byId(exact, "cross.runtimeIdentity.servicesTreeDigestEqualsStandalone")?.satisfied === true,
    "matching servicesTreeDigest is independently required and recognized"
  );
});

test("every G1-G12 figure, verdict and required split field is enforced", () => {
  const valid = { gates: exactGateFigures() };
  check(S.exactGateSetConditions(valid, "gates", GOVERNED).every((c) => c.satisfied),
    "the exact approved G1-G12 fixture satisfies the complete gate family");
  const bypasses = [];
  for (const id of ITEM4_CRITERIA.exactGateSet.gateIds) {
    const spec = ITEM4_CRITERIA.exactGateSet.gates[id];
    const fields = spec.kind === "RATIO"
      ? ["numerator", "denominator", ...(spec.splitReportingRequired ? ["substantiveNumerator", "substantiveDenominator"] : [])]
      : spec.kind === "VERDICT" ? ["verdict"] : [spec.field];
    for (const field of fields) {
      const mutated = clone(valid);
      mutated.gates[id][field] = typeof mutated.gates[id][field] === "number"
        ? mutated.gates[id][field] + 1
        : field === "verdict" ? "FAIL" : "true";
      const own = S.exactGateSetConditions(mutated, `mut-${id}-${field}`, GOVERNED)
        .filter((c) => c.id.includes(`.gate.${id}.`));
      if (own.length === 0 || own.every((c) => c.satisfied)) bypasses.push(`${id}.${field}`);
    }
  }
  check(bypasses.length === 0, `mutated exact-gate fields must fail their own gate: ${bypasses.join(", ")}`);
});

test("servicesTreeDigest is recomputed over the exact recorded governed-file bytes", () => {
  withTempRoot((root) => {
    const serviceIdentity = governedServicesFixture(root);
    const art = { runtimeIdentity: {
      servicesTreeDigest: serviceIdentity.digest,
      servicesTreeFileSet: serviceIdentity.paths
    } };
    check(S.servicesTreeDigestConditions(art, "services", GOVERNED, root).every((c) => c.satisfied),
      "digest of the exact 26-path recorded-order byte stream verifies");

    const lied = clone(art);
    lied.runtimeIdentity.servicesTreeDigest = "0".repeat(64);
    check(byId(S.servicesTreeDigestConditions(lied, "lied", GOVERNED, root),
      "lied.servicesTreeDigest.recomputesFromBytes")?.satisfied === false,
    "a declared servicesTreeDigest cannot substitute for recomputation");

    fs.appendFileSync(path.join(root, ...serviceIdentity.paths[0].split("/")), "drift\n");
    check(byId(S.servicesTreeDigestConditions(art, "drift", GOVERNED, root),
      "drift.servicesTreeDigest.recomputesFromBytes")?.satisfied === false,
    "worktree-byte drift changes the independently recomputed digest");
  });
});

test("A3 binds verified bytes, exactly 3720 rows and recomputed aggregate figures", () => {
  withTempRoot((root) => {
    const sub = { id: "standalone", requiredArtifacts: ["A3"] };
    const gates = exactGateFigures();
    const conditionsFor = (rowCount, mutateRecord = () => {}) => {
      const a3 = writeJsonRef(root, "A3.json", { rows: Array.from({ length: rowCount }, () => null) });
      const art = {
        gates,
        requiredArtifacts: { A3: a3 },
        aggregateRecomputation: {
          a3Sha256: a3.sha256,
          rowsRecomputed: 3720,
          gates: { G1: clone(gates.G1), G2: clone(gates.G2), G3: clone(gates.G3) }
        }
      };
      mutateRecord(art.aggregateRecomputation);
      const states = S.requiredArtifactStates(art, sub, GOVERNED, root);
      return S.aggregateRecomputationConditions(art, "a3", GOVERNED, states, root);
    };
    check(conditionsFor(3720).every((c) => c.satisfied),
      "verified A3 bytes with 3720 rows and exact G1/G2/G3 aggregates satisfy step 3");
    check(byId(conditionsFor(3720, (rec) => { rec.a3Sha256 = "0".repeat(64); }),
      "a3.aggregateRecomputation.bindsVerifiedA3Digest")?.satisfied === false,
    "aggregate recomputation must bind the verified A3 digest");
    check(byId(conditionsFor(3719), "a3.aggregateRecomputation.a3RowsCountedFromBytes")?.satisfied === false,
      "a declared 3720 count cannot conceal 3719 rows in verified A3 bytes");
    check(byId(conditionsFor(3720, (rec) => { rec.rowsRecomputed = 3719; }),
      "a3.aggregateRecomputation.rowCount")?.satisfied === false,
    "the aggregate record itself must cover all 3720 rows");
    check(byId(conditionsFor(3720, (rec) => { rec.gates.G2.substantiveNumerator -= 1; }),
      "a3.aggregateRecomputation.G2.equalsA2")?.satisfied === false,
    "A3 recomputation must equal A2 including the G2 substantive split");
  });
});

test("A2 and A4 must be distinct clean attempts with field-for-field equality", () => {
  withTempRoot((root) => {
    const sub = { id: "standalone", requiredArtifacts: ["A2", "A4"] };
    const digest = "d".repeat(64);
    const common = {
      envelope: "EXACT_GATE_RESULT_V2",
      mode: "STANDALONE",
      verdict: "EXACT",
      servicesTreeDigest: digest,
      gates: exactGateFigures()
    };
    const a2 = writeJsonRef(root, "A2.json", { ...common, attemptId: "campaign" });
    const evaluateA4 = (overrides) => {
      const a4 = writeJsonRef(root, "A4.json", { ...clone(common), attemptId: "lock", clean: true, ...overrides });
      const art = {
        ...common,
        runtimeIdentity: { servicesTreeDigest: digest, servicesTreeDigestVerified: true },
        requiredArtifacts: { A2: a2, A4: a4 },
        lockVerification: { separateCleanRun: true, reproducedA2: true, servicesTreeDigest: digest }
      };
      const states = S.requiredArtifactStates(art, sub, GOVERNED, root);
      return S.lockVerificationConditions(art, "lock", GOVERNED, states, root);
    };
    check(evaluateA4({}).every((c) => c.satisfied),
      "a separate clean A4 with every compared field equal to A2 satisfies step 5");
    check(byId(evaluateA4({ attemptId: "campaign" }), "lock.lockVerification.a4DistinctAttempt")?.satisfied === false,
      "the same attempt identifier cannot stand in for a separate run");
    check(byId(evaluateA4({ clean: false }), "lock.lockVerification.a4Clean")?.satisfied === false,
      "a lock-verification attempt that is not clean cannot reproduce A2");
    const differentGates = exactGateFigures();
    differentGates.G8.numerator -= 1;
    check(byId(evaluateA4({ gates: differentGates }), "lock.lockVerification.a4EqualsA2FieldForField")?.satisfied === false,
      "a one-field A4 gate discrepancy defeats field-for-field equality");
  });
});

test("freeze P2 cleanliness attribution and P3 explicit paths are independently enforced", () => {
  const valid = {
    worktreeCleanAtFreeze: { clean: true, method: "git status --porcelain", evidence: "captured-empty-output" },
    runtimeFileSetEnumeration: "EXPLICIT_BY_PATH"
  };
  const paths = ["services/a.js", "services/b.js"];
  check(S.freezePreconditionP2P3Conditions(valid, paths, "freeze-unit").every((c) => c.satisfied),
    "attributed clean state plus explicit literal path enumeration satisfies P2/P3");
  for (const [label, man, listed, id] of [
    ["dirty", { ...valid, worktreeCleanAtFreeze: { ...valid.worktreeCleanAtFreeze, clean: false } }, paths, "P2.clean"],
    ["unattributed", { ...valid, worktreeCleanAtFreeze: { clean: true, method: "", evidence: "" } }, paths, "P2.methodAndEvidenceNamed"],
    ["wrong-mode", { ...valid, runtimeFileSetEnumeration: "GLOB" }, paths, "P3.enumerationExplicitByPath"],
    ["glob", valid, ["services/*.js"], "P3.noWildcardOrDirectoryEntries"],
    ["directory", valid, ["services/"], "P3.noWildcardOrDirectoryEntries"]
  ]) {
    check(byId(S.freezePreconditionP2P3Conditions(man, listed, label), `${label}.${id}`)?.satisfied === false,
      `${label} mutation fails ${id}`);
  }
});

test("only LF-normalized artifact digests verify; raw-only CRLF fails and lone CR is preserved", () => {
  withTempRoot((root) => {
    const rel = "A1.json";
    const bytes = Buffer.from('{"line":"one\r\ntwo","lone":"x\ry"}\r\n', "utf8");
    writeFixture(root, rel, bytes);
    const sub = { id: "standalone", requiredArtifacts: ["A1"] };
    const stateFor = (declaredSha) => S.requiredArtifactStates(
      { requiredArtifacts: { A1: { path: rel, sha256: declaredSha } } }, sub, GOVERNED, root
    ).get("A1");

    const rawOnly = stateFor(sha256(bytes));
    check(rawOnly.verdict === "MATCH_RAW_ONLY", "fixture distinguishes raw-only from canonical digest");
    check(rawOnly.verified === false, "raw-only CRLF digest is not accepted");

    const canonical = stateFor(canonicalSha256(bytes));
    check(canonical.verified === true, "LF-normalized digest verifies");
    const wronglyDeletesLoneCr = sha256(Buffer.from(bytes.toString("utf8").replace(/\r/gu, ""), "utf8"));
    check(canonical.state.canonicalSha !== wronglyDeletesLoneCr, "canonicalization preserves lone CR bytes");
  });
});

test("verified artifact bytes and parsed value are retained and not re-read", () => {
  withTempRoot((root) => {
    const rel = "A1.json";
    const original = Buffer.from('{"runtimeIdentity":{"servicesTreeDigest":"kept"}}\n');
    const target = writeFixture(root, rel, original);
    const sub = { id: "standalone", evidenceSource: "envelope.json", requiredArtifacts: ["A1"] };
    const art = { requiredArtifacts: { A1: { path: rel, sha256: canonicalSha256(original) } } };
    const states = S.requiredArtifactStates(art, sub, GOVERNED, root);
    const a1 = states.get("A1");
    check(Buffer.isBuffer(a1.verifiedBytes), "verified bytes are retained in artifact state");
    check(a1.parsedValue?.runtimeIdentity?.servicesTreeDigest === "kept", "verified bytes are parsed exactly once");

    fs.writeFileSync(target, '{"tampered":true}\n');
    const conditions = S.requiredArtifactConditions(art, sub, "once", GOVERNED, root, states);
    check(
      byId(conditions, "once.requiredArtifact.A1.carriesRequiredFields")?.satisfied === true,
      "downstream checks consume retained verified bytes rather than re-reading a raced path"
    );
  });
});

test("anti-circularity requires a verified supporting record, not arbitrary prose", () => {
  const conditions = S.antiCircularityAlternativeConditions(
    { antiCircularity: { satisfiedByAlternative: "i", alternativeEvidence: "trust me" } },
    "anti",
    GOVERNED
  );
  check(byId(conditions, "anti.antiCircularity.alternativeNamed")?.satisfied === true, "alternative i is named");
  check(byId(conditions, "anti.antiCircularity.alternativeEvidenced")?.satisfied === false,
    "arbitrary non-empty prose is not supporting evidence");
  check(byId(conditions, "anti.antiCircularity.supportingRecordVerified")?.satisfied === false,
    "missing or unverified supporting record is an explicit blocking condition");
});

test("digest verification cannot turn self-authored anti-circularity claims into D3 proof", () => {
  withTempRoot((root) => {
    const sub = { id: "standalone", evidenceSource: "envelope.json", requiredArtifacts: ["A1"] };
    const variants = [
      ["runtime-only", "i", {
        runtimeIdentity: { analyzerFilesDigest: "a".repeat(64), servicesTreeDigest: "b".repeat(64) }
      }],
      ["empty-proof", "i", {
        runtimeIdentity: { analyzerFilesDigest: "a".repeat(64), servicesTreeDigest: "b".repeat(64) },
        antiCircularityProof: {}
      }],
      ["self-asserted-i", "i", {
        runtimeIdentity: { analyzerFilesDigest: "a".repeat(64), servicesTreeDigest: "b".repeat(64) },
        antiCircularityProof: {
          alternative: "i",
          expectationsFixedBeforeRuntimeMeasured: true,
          expectationsFixedAt: "2026-01-01T00:00:00Z",
          runtimeMeasuredAt: "2026-01-02T00:00:00Z"
        }
      }],
      ["self-asserted-ii", "ii", {
        runtimeIdentity: { analyzerFilesDigest: "a".repeat(64), servicesTreeDigest: "b".repeat(64) },
        antiCircularityProof: {
          alternative: "ii",
          corpusLabel: "UNSEEN",
          reproducedAgainstUnseenOrHoldoutCorpus: true,
          corpusUsedToDeriveOrReviseExpectations: false
        }
      }],
      ["wrong-alternative", "i", {
        runtimeIdentity: { analyzerFilesDigest: "a".repeat(64), servicesTreeDigest: "b".repeat(64) },
        antiCircularityProof: {
          alternative: "ii",
          corpusLabel: "HOLDOUT",
          reproducedAgainstUnseenOrHoldoutCorpus: true
        }
      }]
    ];

    const bypasses = [];
    for (const [label, chosen, record] of variants) {
      const rel = `${label}.json`;
      const bytes = Buffer.from(`${JSON.stringify(record)}\n`);
      writeFixture(root, rel, bytes);
      const reference = { path: rel, sha256: canonicalSha256(bytes) };
      const art = {
        antiCircularity: { satisfiedByAlternative: chosen, alternativeEvidence: reference },
        requiredArtifacts: { A1: reference }
      };
      const states = S.requiredArtifactStates(art, sub, GOVERNED, root);
      check(states.get("A1")?.verified === true, `${label} fixture is digest-verified before semantic review`);
      const prefix = `anti-${label}`;
      const conditions = S.antiCircularityAlternativeConditions(art, prefix, GOVERNED, states);
      const provenanceDefinition = byId(
        conditions,
        `${prefix}.antiCircularity.independentlyVerifiableProvenanceDefinitionAvailable`
      );
      const outcome = S.statusFromConditions(conditions, label);
      if (
        outcome.status === "PASS" ||
        provenanceDefinition?.class !== "DEFINITION" ||
        provenanceDefinition?.satisfied !== false
      ) {
        bypasses.push(
          `${label}: status=${outcome.status}, provenanceDefinition=${JSON.stringify(provenanceDefinition ?? null)}`
        );
      }
    }
    check(
      bypasses.length === 0,
      `pinned criteria define no independently verifiable D3 proof schema; self-authored records must block: ${bypasses.join(" | ")}`
    );
  });
});

test("complete Item4 evidence leaves independently verifiable D3 provenance as the only blocker", () => {
  withTempRoot((root) => {
    const serviceIdentity = governedServicesFixture(root);
    const item = clone(S.SUCCESSOR_CONTRACT.exitItems.find((candidate) => candidate.roadmapItem === 4));
    for (const sub of item.subChecks) {
      sub.evidenceSource = exactGateSubcheckFixture(root, sub, serviceIdentity).evidenceSource;
    }
    const outcome = S.evaluateSuccessorItem(item, root, GOVERNED);
    const unmet = [
      ...outcome.conditions,
      ...outcome.subCheckResults.flatMap((sub) => sub.conditions)
    ].filter((condition) => condition.satisfied === false);
    const provenanceOnly =
      outcome.status === "BLOCKED_MISSING_DEFINITION" &&
      unmet.length === 2 &&
      unmet.every((condition) =>
        condition.id.endsWith(".antiCircularity.independentlyVerifiableProvenanceDefinitionAvailable") &&
        condition.class === "DEFINITION" &&
        condition.safePauseRequired !== true
      );
    check(provenanceOnly,
      `all non-D3 Item4 families must be satisfiable; got status=${outcome.status}, unmet=${unmet.map((c) => `${c.id}:${c.class}`).join(", ") || "none"}`);
  });
});

test("direct, dot and filesystem-alias self references are rejected", () => {
  withTempRoot((root) => {
    const evidenceRel = "evidence.json";
    const bytes = Buffer.from('{"runtimeIdentity":{"servicesTreeDigest":"self"}}\n');
    writeFixture(root, evidenceRel, bytes);
    const sub = { id: "standalone", evidenceSource: evidenceRel, requiredArtifacts: ["A1"] };
    for (const spelling of [evidenceRel, `./${evidenceRel}`]) {
      const art = { requiredArtifacts: { A1: { path: spelling, sha256: canonicalSha256(bytes) } } };
      const states = S.requiredArtifactStates(art, sub, GOVERNED, root);
      const conditions = S.requiredArtifactConditions(art, sub, spelling, GOVERNED, root, states);
      check(
        byId(conditions, `${spelling}.requiredArtifacts.noSelfReference`)?.satisfied === false,
        `${spelling} cannot cite the envelope as its own input`
      );
    }

    const alias = path.join(root, "alias.json");
    try {
      fs.symlinkSync(path.join(root, evidenceRel), alias, "file");
    } catch (e) {
      if (["EPERM", "EACCES", "UNKNOWN"].includes(e?.code)) {
        console.log(`SKIP filesystem-alias self-reference regression: OS refused link creation (${e.code})`);
        return;
      }
      throw e;
    }
    const art = { requiredArtifacts: { A1: { path: "alias.json", sha256: canonicalSha256(bytes) } } };
    const states = S.requiredArtifactStates(art, sub, GOVERNED, root);
    const conditions = S.requiredArtifactConditions(art, sub, "alias", GOVERNED, root, states);
    check(
      byId(conditions, "alias.requiredArtifacts.noSelfReference")?.satisfied === false,
      "filesystem alias of the envelope cannot cite itself"
    );
  });
});

test("a hardlink alias cannot make an evidence envelope one of its own required inputs", () => {
  withTempRoot((root) => {
    const evidenceRel = "evidence.json";
    const bytes = Buffer.from('{"runtimeIdentity":{"servicesTreeDigest":"self"}}\n');
    const target = writeFixture(root, evidenceRel, bytes);
    const alias = path.join(root, "hardlink.json");
    try {
      fs.linkSync(target, alias);
    } catch (e) {
      if (["EPERM", "EACCES", "ENOTSUP", "EOPNOTSUPP", "EXDEV"].includes(e?.code)) {
        console.log(`SKIP hardlink self-reference regression: OS refused hardlink creation (${e.code})`);
        return;
      }
      throw e;
    }
    const sub = { id: "standalone", evidenceSource: evidenceRel, requiredArtifacts: ["A1"] };
    const art = { requiredArtifacts: { A1: { path: "hardlink.json", sha256: canonicalSha256(bytes) } } };
    const states = S.requiredArtifactStates(art, sub, GOVERNED, root);
    const conditions = S.requiredArtifactConditions(art, sub, "hardlink", GOVERNED, root, states);
    check(byId(conditions, "hardlink.requiredArtifacts.noSelfReference")?.satisfied === false,
      "filesystem identity, not only path spelling or realpath, detects a hardlink self-reference");
  });
});

test("integrated boundary mutations fail locally without staging or network", () => {
  const sub = S.SUCCESSOR_CONTRACT.exitItems.find((item) => item.roadmapItem === 4)
    .subChecks.find((candidate) => candidate.id === "integrated");
  const valid = {
    invocationRecord: {
      invocationPath: "IN_PROCESS_ASK_BOUNDARY",
      askEntrypoint: "/ask",
      harnessOnlyPath: false,
      inProcess: true,
      deployedStaging: false,
      externalNetworkUsed: false,
      analyzerUnderTestSubstituted: false
    }
  };
  check(S.integratedBoundaryConditions(valid, sub, "valid").every((c) => c.satisfied),
    "valid local in-process /ask record meets every boundary condition");

  for (const [field, value, conditionSuffix] of [
    ["invocationPath", "HARNESS_DIRECT", "invocationPathMatchesContract"],
    ["harnessOnlyPath", true, "harnessOnlyPathNotUsed"],
    ["inProcess", false, "inProcess"],
    ["deployedStaging", true, "noDeployedStagingRelied"],
    ["externalNetworkUsed", true, "noExternalNetwork"],
    ["analyzerUnderTestSubstituted", true, "analyzerNotSubstituted"]
  ]) {
    const mutated = clone(valid);
    mutated.invocationRecord[field] = value;
    const conditions = S.integratedBoundaryConditions(mutated, sub, field);
    check(byId(conditions, `${field}.boundary.${conditionSuffix}`)?.satisfied === false,
      `${field} contradiction fails its boundary condition`);
  }
});

test("nominal holdout labels cannot bypass the commissioned admission packet", () => {
  check(typeof S.holdoutAdmissionConditions === "function",
    "runner exports holdoutAdmissionConditions(campaign, prefix)");
  const nominal = {
    id: "self-labelled-holdout",
    kind: "HOLDOUT",
    evidenceClass: "INDEPENDENT_CLOSURE",
    analyzerInformed: false,
    oracleLineage: ["R5"],
    producedAfterFreeze: true,
    expectationRevisionsSinceFreeze: 0
  };
  const conditions = S.holdoutAdmissionConditions(nominal, "nb2");
  const unresolved = byId(conditions, "nb2.NB2_UNRESOLVED");
  check(unresolved?.class === "PRECONDITION" && unresolved.satisfied === false,
    "NB2 is an explicit unmet PRECONDITION until admission is separately authorized");
  check(unresolved?.safePauseRequired !== true,
    "NB2 is ordinary authorized future-work blocking, not a sequencing SAFE_PAUSE");
  check(byId(conditions, "nb2.commissionedAdmissionPacketPresent")?.satisfied === false,
    "a self-labelled holdout without an admission packet does not qualify");
  check(byId(conditions, "nb2.commissionedAdmissionPacketVerified")?.satisfied === false,
    "an unverified admission packet cannot qualify");
  check(S.statusFromConditions(conditions, "nb2").status !== "PASS", "NB2 remains blocking");

  const dressedUp = {
    ...nominal,
    commissioningAdmissionPacket: {
      commissioned: true,
      verified: true,
      freshActor: true,
      sealedBeforeExecution: true
    }
  };
  const dressedConditions = S.holdoutAdmissionConditions(dressedUp, "dressed");
  const dressedUnresolved = byId(dressedConditions, "dressed.NB2_UNRESOLVED");
  check(dressedUnresolved?.satisfied === false,
    "self-authored packet-shaped fields cannot invent the missing admission mechanism");
  check(S.statusFromConditions(dressedConditions, "dressed").status === "BLOCKED_PRECONDITION",
    "no nominal campaign can clear NB2");
});

test("item 5 owns staging attribution and production remains out of scope downstream", () => {
  const freezeContract = S.SUCCESSOR_CONTRACT.exitItems.find((item) => item.roadmapItem === 5);
  check(freezeContract.stage === "FREEZE", "staging attribution is enforced at the freeze stage");
  check(S.SUCCESSOR_CONTRACT.stagingIdentity.productionInScope === false, "production remains excluded");
  const freezeResult = ITEM("frozenRuntime");
  for (const id of [
    "freeze.stagingIdentity.environmentIsStaging",
    "freeze.stagingIdentity.attributedToFrozenCommit",
    "freeze.stagingIdentity.methodAndEvidenceNamed",
    "freeze.stagingIdentity.verified",
    "freeze.productionOutOfScope"
  ]) {
    check(byId(freezeResult.conditions, id) !== undefined, `${id} is evaluated downstream on item 5`);
  }
  check(freezeResult.status === "BLOCKED_PRECONDITION", `item 5 remains precondition-blocked (got ${freezeResult.status})`);
});

// ---------------------------------------------------------------------------
// 4. Today's honest verdict against the real repository
// ---------------------------------------------------------------------------

test("the run is BLOCKED and claims nothing", () => {
  check(RESULT.contractVersion === 2, `contract version is 2 (got ${RESULT.contractVersion})`);
  check(RESULT.executionStatus === "BLOCKED", `executionStatus is BLOCKED (got ${RESULT.executionStatus})`);
  check(RESULT.blockedReason === "PRECONDITION_UNSATISFIED", `blockedReason (got ${RESULT.blockedReason})`);
  check(RESULT.phase10AClosure === "NOT_CLAIMED", "Phase 10A is not claimed closed");
  check(RESULT.phase10BAuthorization === "NOT_CLAIMED", "Phase 10B is not authorized");
  check(RESULT.reviewDisposition === "PENDING_INTERNAL_REVIEW", "the runner cannot set any other disposition");
  check(S.SUCCESSOR_CONTRACT.phase10AClosure.autoClose === false, "a PASS would still not close Phase 10A");
  check(RESULT.safePause.required === false, "the unmutated corrected contract has no sequencing defect to SAFE_PAUSE");
});

test("both governed inputs verify against their pinned digests", () => {
  check(RESULT.governedInputs.authorization.matched === true, "authorization digest pinned");
  check(RESULT.governedInputs.approvedCriteria.matched === true, "approved-criteria digest pinned");
  check(RESULT.governedInputs.approvedCriteria.expectedSha256 === CRITERIA_SHA, "result reports final criteria pin");
  check(RESULT.governedInputs.ownerCriteriaFidelityConfirmation.expectedSha256 === CONFIRMATION_SHA,
    "result reports final confirmation pin");
  const auth = S.verifyPinnedInput(REPO_ROOT, RESULT.governedInputs.authorization.path, "0".repeat(64));
  check(auth.matched === false, "a wrong pinned digest does not match");
});

// Owner ruling Decision 1 recorded criteria fidelity as CONFIRMED, via a separate
// hash-pinned artifact rather than by editing the immutable criteria artifact. The
// precondition therefore clears; nothing else about items 1-6 changes.
test("the owner's criteria-fidelity confirmation clears the precondition and nothing more", () => {
  check(
    RESULT.governedInputs.approvedCriteria.ownerConfirmationOfFidelityStatus === "PENDING",
    "the immutable criteria artifact is unedited and still records PENDING"
  );

  const conf = RESULT.governedInputs.ownerCriteriaFidelityConfirmation;
  check(conf.present === true, "the owner confirmation artifact is present");
  check(conf.matched === true, "the owner confirmation artifact matches its pinned digest");
  check(conf.ownerConfirmationOfFidelityStatus === "CONFIRMED", "the owner confirmation records CONFIRMED");
  check(
    conf.ownerConfirmationScope === "CRITERIA_AND_PROVENANCE_DEFINITION_ONLY",
    "the confirmation is scoped to the criteria/provenance definition only"
  );
  check(conf.bindsPinnedCriteriaDigest === true, "the confirmation binds the exact pinned criteria digest");

  for (const id of [
    "decisionClosure", "relationClosure", "reasonClosure",
    "standaloneAndIntegratedExactGates", "frozenRuntime", "postFreezeEvidence"
  ]) {
    const item = ITEM(id);
    const fidelity = item.conditions.find((c) => c.id === "owner.criteriaFidelityConfirmed");
    check(fidelity !== undefined && fidelity.satisfied === true, `${id} fidelity precondition cleared`);
    check(
      fidelity.resolvedFrom === "SEPARATE_HASH_PINNED_OWNER_CONFIRMATION_ARTIFACT",
      `${id} resolves fidelity from the pinned owner artifact, not from an assumption`
    );
    // The confirmation confers no PASS. Every one of these items is still short of
    // its own evidence, and the gate must keep saying so.
    check(item.status !== "PASS", `${id} is not PASS on the strength of a confirmation (got ${item.status})`);
    // Item 4 aggregates two mandatory subchecks, so its own remaining gaps are
    // reported there rather than in its top-level condition list.
    const shortfall =
      item.conditions.some((c) => !c.satisfied) ||
      (item.subCheckResults ?? []).some((s) => s.status !== "PASS");
    check(shortfall, `${id} still reports unmet conditions of its own`);
  }
});

// A confirmation issued for one set of criteria must never carry over to another.
test("a fidelity confirmation that does not bind the pinned criteria digest is rejected", () => {
  const gi = S.loadGovernedInputs(REPO_ROOT);
  const rebound = {
    ...gi,
    criteria: { ...gi.criteria, provenance: { ...gi.criteria.provenance, ownerConfirmationOfFidelityStatus: "PENDING" } },
    fidelity: { ...gi.fidelity, confirms: { ...gi.fidelity.confirms, criteriaSha256: "0".repeat(64) } }
  };
  const conditions = S.ownerFidelityConditions(rebound);
  const binding = conditions.find((c) => c.id === "owner.fidelityConfirmationBindsCriteriaDigest");
  check(binding !== undefined && binding.satisfied === false, "a mis-bound confirmation fails the binding condition");
  const confirmed = conditions.find((c) => c.id === "owner.criteriaFidelityConfirmed");
  check(confirmed.satisfied === false, "and confers no fidelity confirmation");
});

test("every condition is evaluated, so one gap does not hide the others", () => {
  const item = ITEM("relationClosure");
  check(item.conditions.length >= 30, `relation closure reports its full condition list (${item.conditions.length})`);
  const classes = new Set(item.conditions.map((c) => c.class));
  for (const klass of ["PRECONDITION", "DEFINITION", "EVIDENCE_PRESENCE", "CONTENT"]) {
    check(classes.has(klass), `relation closure evaluates ${klass} conditions even while precondition-blocked`);
  }
  check(
    item.conditions.filter((c) => !c.satisfied).length > 1,
    "all unmet conditions are reported, not just the controlling one"
  );
});

test("items 7 and 8 fail on the additive split rows, not on owner fidelity", () => {
  for (const [id, label] of [
    ["deterministicCleanCycles", "Deterministic clean cycles closure"],
    ["stagingCleanCycles", "Staging clean cycles closure"]
  ]) {
    const item = ITEM(id);
    // Owner ruling Decision 2 added the two forward-looking rows at their honest
    // value. That moves these items from unevaluable to evaluated-and-failing;
    // it does not move them toward PASS.
    check(item.status === "FAIL", `${id} is FAIL (got ${item.status})`);
    check(
      item.conditions.every((c) => c.id !== "owner.criteriaFidelityConfirmed"),
      `${id} derives from D9/D10 and does not carry the items-1-6 fidelity precondition`
    );
    check(
      item.conditions.filter((c) => c.class === "DEFINITION").every((c) => c.satisfied),
      `${id} has a complete operative definition`
    );
    const row = item.conditions.find((c) => c.id === "split.splitRowPresent");
    check(row.satisfied === true, `the forward-looking row '${label}' now exists in the ledger`);
    check(row.historicalCombinedRow.canProducePass === false, "the historical combined row can never produce PASS");
    check(row.historicalCombinedRow.role === "DIAGNOSTIC_ONLY", "the historical row is diagnostic context only");
    check(
      row.occurrences.length === 1,
      `'${label}' is unambiguous: exactly one controlling row (${row.occurrences.length})`
    );
    const value = item.conditions.find((c) => c.id === "split.splitRowEqualsExpectedValue");
    check(
      value.satisfied === false,
      `'${label}' is recorded UNSATISFIED and does not meet the expected value`
    );
  }
});

test("the historical combined row is read but never rewritten", () => {
  const item = ITEM("deterministicCleanCycles");
  const observed = item.historicalCombinedRowSelection;
  check(observed.status === "FOUND", "the historical combined row is still present in the ledger");
  check(observed.token === "UNSATISFIED", `the historical row is recorded UNSATISFIED (got ${observed.token})`);
  check(CRITERIA.criteria.deterministicCleanCycles.split.mode === "ADDITIVE", "the split is additive (D10)");
  check(
    CRITERIA.criteria.deterministicCleanCycles.split.historicalRowsRewritten === false,
    "no historical row is rewritten"
  );
  check(
    CRITERIA.criteria.deterministicCleanCycles.split.fallbackCanProducePass === false,
    "the fallback has no PASS path by construction"
  );
  check(
    S.SUCCESSOR_CONTRACT.ownerGovernedBehavior.neverWrites.includes("knowledge/CURRENT_STATE.md"),
    "the runner never writes the ledger it reads"
  );
  check(RESULT.governedInputs.ledger.writtenByThisRunner === false, "and reports that it did not");
});

test("inherited items 9-11 are delegated to A15 V1 unchanged", () => {
  const nine = ITEM("independentReview");
  check(nine.inheritedFromA15V1 === true, "item 9 is delegated");
  check(nine.status === "FAIL", `item 9 reads the ledger's UNSATISFIED as FAIL (got ${nine.status})`);
  const ten = ITEM("e2");
  check(ten.inheritedFromA15V1 === true, "item 10 is delegated");
  check(ten.status === "PASS", `item 10 verifies its manifest and verdict (got ${ten.status})`);
  const eleven = ITEM("a15");
  check(eleven.status === "NOT_APPLICABLE", "the gate does not evaluate itself");
  // Delegation must be genuine: the successor's verdict has to equal V1's own.
  for (const id of ["independentReview", "e2", "a15"]) {
    const contractItem = S.SUCCESSOR_CONTRACT.exitItems.find((i) => i.id === id);
    const v1Verdict = V1.evaluateCheck(contractItem, REPO_ROOT);
    check(ITEM(id).status === v1Verdict.status, `${id} matches V1's own verdict exactly`);
  }
});

test("no criterion that lacks its evidence is reported as satisfied", () => {
  const closureItems = RESULT.itemResults.filter((r) => r.roadmapItem >= 1 && r.roadmapItem <= 8);
  check(closureItems.length === 8, "items 1-8 present");
  check(closureItems.every((r) => r.status !== "PASS"), "none of items 1-8 passes today");
  check(RESULT.governedInputs.freezeAnchor.present === false, "no freeze manifest exists yet");
  check(RESULT.governedInputs.freezeAnchor.frozenCommit === null, "so there is no frozen commit to attribute to");
  check(RESULT.safePause.required === false, "no D13 containment conflict is on disk to pause on");
  const item4 = ITEM("standaloneAndIntegratedExactGates");
  check(item4.subCheckResults.every((sub) => sub.status !== "PASS"), "neither Item4 subcheck claims execution");
  check(
    item4.subCheckResults.every((sub) => byId(sub.conditions, `exactGate.${sub.id}.present`)?.satisfied === false),
    "both Item4 V2 evidence envelopes are absent"
  );
  const item6 = ITEM("postFreezeEvidence");
  check(item6.status === "BLOCKED_PRECONDITION", `Item6 is precondition-blocked (got ${item6.status})`);
  const nb2 = byId(item6.conditions, "postFreeze.NB2_UNRESOLVED");
  check(nb2?.class === "PRECONDITION" && nb2.satisfied === false,
    "real Item6 exposes NB2_UNRESOLVED as an unmet PRECONDITION");
  check(nb2?.safePauseRequired !== true, "real NB2 block does not request SAFE_PAUSE");
  check((item6.safePause ?? []).length === 0, "real Item6 has no sequencing-inversion SAFE_PAUSE");
  check(byId(item6.conditions, "postFreeze.present")?.satisfied === false, "no real post-freeze campaign ledger exists");
  check(RESULT.phase10AClosure === "NOT_CLAIMED", "no closure claim is reachable today");
  check(RESULT.phase10BAuthorization === "NOT_CLAIMED", "no Phase 10B authorization is reachable today");
});

test("provenance is recorded without being enforced as an equality gate", () => {
  const base = S.SUCCESSOR_CONTRACT.inputsAndPrerequisites.authoringBaseHead;
  check(base.enforced === false, "the authoring base commit is provenance, not a precondition");
  check(base.role === "PROVENANCE_RECORD", "declared as a provenance record");
  check(RESULT.preflight.observedHead.present === true, "the observed head is captured into the evidence");
  check(/^[0-9a-f]{40}$/.test(RESULT.preflight.observedHead.commit), "as a full commit id");
  check(RESULT.preflight.canonicalEolPolicy === "CRLF_TO_LF_ONLY", "the canonical EOL policy is recorded");
});

// ---------------------------------------------------------------------------
// 5. Item-5 freeze integrity mutation coverage (F3, F4, F6/A3, X4)
// ---------------------------------------------------------------------------
//
// These fixtures intentionally use actual Git history and committed blobs. A
// self-authored manifest field, a mocked Git result, or source-text inspection
// would not establish that the Item-5 controls reject the mutations below.

const FREEZE_MANIFEST_REL = "evaluation/results/phase10a-closure-v1/freeze/FREEZE_MANIFEST_V1.json";
const CANONICAL_EXPECTATIONS = [
  [
    "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json",
    "0227a5b4b6c2eb552427e002b6a66d50b39a06635c84f74798de81ffa608b263"
  ],
  [
    "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/R20_DEVELOPMENT_ORACLE_FROZEN_R1.json",
    "ba0163932fc64d59070d8bba93a23645d03598abb07d612cea25607684503f1f"
  ],
  [
    "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r2/R20_DEVELOPMENT_ORACLE_FROZEN_R2.json",
    "1347a918ee643723531438bfe6d305756c6a43feffbe042ac1ddb2c6bf6c8ccd"
  ],
  [
    "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json",
    "ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54"
  ]
];
const RUNTIME_MUTABLE_FIELD = ["runtime", "Mutable"].join("");

function runtimeMutableFalseRecord(fields = {}) {
  const record = { ...fields };
  record[RUNTIME_MUTABLE_FIELD] = Boolean(0);
  return record;
}

function fixtureGit(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function fixturePendingChanges(root) {
  // Staged-only entries (e.g. `A  file`) are progress, not pending work: a
  // freshly staged new path stays listed there until it is committed. Only
  // worktree-side deltas, untracked paths, and unmerged states mean `add`
  // did not capture everything.
  return execFileSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).split(/\r?\n/u).filter((line) => {
    if (line.length < 2) return false;
    const [x, y] = line;
    return x === "?" || x === " " || y !== " ";
  }).join("\n").trim();
}

function fixtureSleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Positive content control: git can observe a freshly rewritten file with
// stale bytes (status looks clean because the stale view equals HEAD), so a
// quiet `git status` alone cannot prove staging captured the intended bytes.
// Recompute the blob oid Node wrote and compare it against the oid the index
// actually recorded for the path.
function gitBlobOid(bytes) {
  return createHash("sha1").update(Buffer.concat([
    Buffer.from(`blob ${bytes.length}\0`, "utf8"), bytes
  ])).digest("hex");
}
function indexBlobOid(root, relPath) {
  let listing;
  try { listing = fixtureGit(root, "ls-files", "--stage", "--", relPath); } catch { return null; }
  const firstLine = listing.split(/\r?\n/u).find(Boolean);
  if (!firstLine) return null;
  const [meta] = firstLine.split("\t", 1);
  return meta.trim().split(" ")[1] ?? null;
}
function diagnoseStaging(root, relPaths) {
  return relPaths.map((relPath) => {
    let nodeOid = null;
    try { nodeOid = gitBlobOid(fs.readFileSync(path.join(root, ...relPath.split("/")))); } catch { /* deleted */ }
    return `${relPath}: node=${nodeOid ?? "<deleted>"} index=${indexBlobOid(root, relPath) ?? "<absent>"}`;
  }).join("; ");
}
function commitFixture(root, subject) {
  // A file written microseconds before `git add` runs can be observed with
  // stale contents on this Windows host, leaving the modification unstaged
  // (or invisibly clean) while `add` exits 0. Poll with real delays, then
  // positively verify that every path that was dirty before staging is
  // recorded in the index with exactly the bytes Node wrote; never commit a
  // partially staged fixture.
  const dirtyBefore = fixturePendingChanges(root);
  const trackedDirty = dirtyBefore.split("\n").filter((line) => {
    if (line.length < 2) return false;
    const [x, y] = line;
    return !(x === "?" && y === "?");
  }).map((line) => line.slice(3).trim()).filter(Boolean);
  let lastProblem = "";
  let settled = false;
  for (let attempt = 1; attempt <= 40 && !settled; attempt += 1) {
    fixtureGit(root, "add", "--all");
    const pending = fixturePendingChanges(root);
    if (pending !== "") {
      lastProblem = `unstaged: ${pending}`;
      fixtureSleep(150);
      continue;
    }
    const mismatches = trackedDirty.filter((relPath) => {
      let bytes;
      try { bytes = fs.readFileSync(path.join(root, ...relPath.split("/"))); }
      catch { return indexBlobOid(root, relPath) !== null; } // deletion must leave the index
      return indexBlobOid(root, relPath) !== gitBlobOid(bytes);
    });
    if (mismatches.length === 0) { settled = true; break; }
    lastProblem = `stale-staged: ${diagnoseStaging(root, mismatches)}`;
    fixtureSleep(150);
  }
  if (!settled) {
    throw new Error(`fixture staging did not settle after 40 attempts: ${lastProblem}`);
  }
  fixtureGit(root, "commit", "--quiet", "-m", subject);
  return fixtureGit(root, "rev-parse", "HEAD");
}

function initItem5GitFixture(root) {
  fixtureGit(root, "init", "--quiet", "--initial-branch=main");
  fixtureGit(root, "config", "user.email", "qa@tina.invalid");
  fixtureGit(root, "config", "user.name", "TINA QA");
  const services = governedServicesFixture(root);
  const frozenCommit = commitFixture(root, "seed governed runtime");
  return { services, frozenCommit };
}

function requireFreezeHelper(name) {
  check(typeof S[name] === "function", `runner exports ${name}(man, prefix, gi, root, frozenCommit)`);
  return S[name];
}

function requireAllSatisfied(conditions, label) {
  check(Array.isArray(conditions), `${label} returns a condition array`);
  check(conditions.length > 0, `${label} returns non-vacuous conditions`);
  check(conditions.every((condition) => condition.satisfied === true), `${label} valid fixture satisfies every condition`);
}

function requireRejected(conditions, label) {
  check(Array.isArray(conditions), `${label} returns a condition array`);
  check(conditions.some((condition) => condition.satisfied === false), `${label} mutation fails closed`);
}

function item5Gi() {
  return { criteria: clone(CRITERIA) };
}

test("F3 services-tree digest is required, recomputed from recorded bytes, and detects worktree tampering", () => {
  const helper = requireFreezeHelper("freezeServicesTreeDigestConditions");
  withTempRoot((root) => {
    const { services, frozenCommit } = initItem5GitFixture(root);
    const valid = {
      servicesTreeDigest: services.digest,
      servicesTreeFileSet: services.paths
    };
    requireAllSatisfied(helper(valid, "f3.valid", item5Gi(), root, frozenCommit), "F3 valid fixture");

    const mutations = [
      ["missing digest", (man) => { delete man.servicesTreeDigest; }],
      ["wrong digest", (man) => { man.servicesTreeDigest = "0".repeat(64); }],
      ["tampered governed content", () => {
        fs.appendFileSync(path.join(root, ...services.paths[0].split("/")), "F3 content drift\n");
      }]
    ];
    for (const [label, mutate] of mutations) {
      const man = clone(valid);
      mutate(man);
      requireRejected(helper(man, `f3.${label}`, item5Gi(), root, frozenCommit), `F3 ${label}`);
    }
  });
});

test("F4 test source contributes no machine-readable false record to the Git-history scan", () => {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const falseToken = String(Boolean(0));
  const detector = new RegExp(
    `(?:["']${RUNTIME_MUTABLE_FIELD}["']|\\b${RUNTIME_MUTABLE_FIELD}\\b)\\s*:\\s*${falseToken}(?=\\s*[,}\\]])`,
    "u"
  );
  check(detector.test(source) === false, "this test file cannot be mistaken for a committed runtimeMutable false record");
});

test("F4 runtime mutability requires a literal false and a real first-false Git transition", () => {
  const helper = requireFreezeHelper("freezeRuntimeMutabilityConditions");
  const conditionsFor = (history, mutate = () => {}) => withTempRoot((root) => {
    fixtureGit(root, "init", "--quiet", "--initial-branch=main");
    fixtureGit(root, "config", "user.email", "qa@tina.invalid");
    fixtureGit(root, "config", "user.name", "TINA QA");
    writeJsonRef(root, FREEZE_MANIFEST_REL, { runtimeMutable: history.initial });
    const runtimeCommit = commitFixture(root, "runtime mutable baseline");
    if (history.duplicateFalse === true) {
      writeJsonRef(root, FREEZE_MANIFEST_REL, runtimeMutableFalseRecord({ frozenCommit: runtimeCommit }));
      commitFixture(root, "reachable pre-freeze false record");
    }
    writeJsonRef(root, FREEZE_MANIFEST_REL, runtimeMutableFalseRecord({
      frozenCommit: runtimeCommit,
      firstFalseCommit: runtimeCommit
    }));
    commitFixture(root, "downstream freeze manifest");
    const man = runtimeMutableFalseRecord({ frozenCommit: runtimeCommit, firstFalseCommit: runtimeCommit });
    mutate(man);
    return helper(man, "f4", item5Gi(), root, runtimeCommit);
  });

  requireAllSatisfied(conditionsFor({ initial: true }), "F4 valid true-to-false history");
  withTempRoot((root) => {
    fixtureGit(root, "init", "--quiet", "--initial-branch=main");
    fixtureGit(root, "config", "user.email", "qa@tina.invalid");
    fixtureGit(root, "config", "user.name", "TINA QA");
    writeJsonRef(root, FREEZE_MANIFEST_REL, { runtimeMutable: true });
    const runtimeCommit = commitFixture(root, "runtime baseline before freeze");
    writeJsonRef(root, FREEZE_MANIFEST_REL, runtimeMutableFalseRecord({ frozenCommit: runtimeCommit }));
    commitFixture(root, "committed freeze record");
    writeFixture(root, "unrelated-later-head.txt", Buffer.from("later unrelated commit\n"));
    commitFixture(root, "unrelated commit after freeze");
    requireAllSatisfied(
      helper(runtimeMutableFalseRecord({ frozenCommit: runtimeCommit }), "f4.later-head", item5Gi(), root, runtimeCommit),
      "F4 valid committed freeze record remains accepted after an unrelated later HEAD commit"
    );
  });
  withTempRoot((root) => {
    fixtureGit(root, "init", "--quiet", "--initial-branch=main");
    fixtureGit(root, "config", "user.email", "qa@tina.invalid");
    fixtureGit(root, "config", "user.name", "TINA QA");
    writeJsonRef(root, FREEZE_MANIFEST_REL, { runtimeMutable: true });
    const runtimeCommit = commitFixture(root, "runtime baseline before duplicate-key freeze record");
    const falseToken = String(Boolean(0));
    const duplicateCriticalFieldJson =
      `{"frozenCommit":"${runtimeCommit}","${RUNTIME_MUTABLE_FIELD}":true,"${RUNTIME_MUTABLE_FIELD}":${falseToken}}\n`;
    writeFixture(root, FREEZE_MANIFEST_REL, Buffer.from(duplicateCriticalFieldJson, "utf8"));
    commitFixture(root, "duplicate runtime mutability field freeze record");
    requireRejected(
      helper(runtimeMutableFalseRecord({ frozenCommit: runtimeCommit }), "f4.duplicate-key", item5Gi(), root, runtimeCommit),
      "F4 duplicate runtimeMutable JSON keys cannot be accepted because JSON.parse keeps only the final false value"
    );
  });
  for (const [label, history, mutate] of [
    ["missing runtimeMutable", { initial: true }, (man) => { delete man.runtimeMutable; }],
    ["runtimeMutable true", { initial: true }, (man) => { man.runtimeMutable = true; }],
    ["truthy nonboolean runtimeMutable", { initial: true }, (man) => { man.runtimeMutable = "false"; }],
    ["self-authored first-false bypass", { initial: true, duplicateFalse: true }, () => {}]
  ]) {
    requireRejected(conditionsFor(history, mutate), `F4 ${label}`);
  }
});

test("F6/A3 drift evidence is digest-bound, complete, current, and checked against Git blobs", () => {
  const helper = requireFreezeHelper("freezeDriftVerificationConditions");
  withTempRoot((root) => {
    const { services, frozenCommit } = initItem5GitFixture(root);
    const governedPath = services.paths[0];
    const governedBytes = fs.readFileSync(path.join(root, ...governedPath.split("/")));
    const a3Rel = "evidence/A3-post-freeze-drift.json";
    const discardA3 = () => fs.rmSync(path.join(root, ...a3Rel.split("/")), { force: true });
    const writeA3 = (overrides = {}) => {
      const toCommit = fixtureGit(root, "rev-parse", "HEAD");
      return writeJsonRef(root, a3Rel, {
        fromCommit: frozenCommit,
        toCommit,
        governedRuntimeSet: services.paths,
        ...overrides
      });
    };
    const conditionsFor = (variant) => {
      discardA3();
      let a3 = null;
      let restore = null;
      if (variant === "changed") {
        fs.appendFileSync(path.join(root, ...governedPath.split("/")), "F6 committed drift\n");
        commitFixture(root, "mutate governed path after freeze");
        restore = () => {
          discardA3();
          writeFixture(root, governedPath, governedBytes);
          commitFixture(root, "restore governed path after F6 drift mutation");
        };
      }
      if (variant !== "missing") {
        const overrides = variant === "omitted"
          ? { governedRuntimeSet: services.paths.slice(1) }
          : variant === "stale-freeze" ? { fromCommit: "0".repeat(40) } : {};
        a3 = writeA3(overrides);
      }
      const man = a3 === null
        ? {}
        : { postFreezeDriftVerification: { artifactPath: a3.path, sha256: a3.sha256 } };
      return { conditions: helper(man, `f6.${variant}`, item5Gi(), root, frozenCommit), restore };
    };

    const valid = conditionsFor("valid");
    requireAllSatisfied(valid.conditions, "F6 valid A3");
    discardA3();
    for (const variant of ["missing", "changed", "omitted", "stale-freeze"]) {
      const result = conditionsFor(variant);
      requireRejected(result.conditions, `F6/A3 ${variant}`);
      discardA3();
      result.restore?.();
    }
  });
});

test("X4 canonical oracle expectations are exact and immutable at frozen and evaluated HEAD commits", () => {
  const helper = requireFreezeHelper("freezeOracleExpectationImmutabilityConditions");
  withTempRoot((root) => {
    fixtureGit(root, "init", "--quiet", "--initial-branch=main");
    fixtureGit(root, "config", "user.email", "qa@tina.invalid");
    fixtureGit(root, "config", "user.name", "TINA QA");
    const canonicalBytes = new Map();
    const canonicalExpectationSet = CANONICAL_EXPECTATIONS.map(([rel, expectedSha]) => {
      const bytes = fs.readFileSync(abs(rel));
      check(sha256(bytes) === expectedSha, `canonical fixture source ${rel} has its owner-approved digest`);
      canonicalBytes.set(rel, bytes);
      writeFixture(root, rel, bytes);
      return { path: rel, sha256: expectedSha };
    });
    const frozenCommit = commitFixture(root, "freeze canonical expectation set");
    const conditionsFor = (variant) => {
      const gi = item5Gi();
      gi.criteria.criteria.frozenRuntime.canonicalExpectationSet = clone(canonicalExpectationSet);
      const man = { canonicalExpectationSet: clone(canonicalExpectationSet) };
      let restore = null;

      if (typeof variant === "number") {
        const rel = canonicalExpectationSet[variant].path;
        fs.appendFileSync(path.join(root, ...rel.split("/")), `\nX4 payload mutation ${variant}\n`);
        commitFixture(root, `mutate canonical expectation ${variant}`);
        restore = () => {
          writeFixture(root, rel, canonicalBytes.get(rel));
          commitFixture(root, `restore canonical expectation ${variant}`);
        };
      }
      if (variant === "incomplete") gi.criteria.criteria.frozenRuntime.canonicalExpectationSet.pop();
      if (variant === "extra") {
        man.canonicalExpectationSet.push({
          path: "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r4/R20_DEVELOPMENT_ORACLE_FROZEN_R4.json",
          sha256: "e".repeat(64)
        });
      }
      if (variant === "duplicate") man.canonicalExpectationSet.push(clone(canonicalExpectationSet[0]));
      if (variant === "substituted-path") {
        man.canonicalExpectationSet[0] = {
          path: "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r4/R20_DEVELOPMENT_ORACLE_FROZEN_R4.json",
          sha256: canonicalExpectationSet[0].sha256
        };
      }
      if (variant === "substituted-digest") man.canonicalExpectationSet[0].sha256 = "0".repeat(64);
      if (variant === "unverifiable") {
        const rel = canonicalExpectationSet[0].path;
        fs.rmSync(path.join(root, ...rel.split("/")));
        commitFixture(root, "remove canonical expectation at evaluated HEAD");
        restore = () => {
          writeFixture(root, rel, canonicalBytes.get(rel));
          commitFixture(root, "restore canonical expectation after unresolvable head");
        };
      }
      return { conditions: helper(man, `x4.${String(variant)}`, gi, root, frozenCommit), restore };
    };

    requireAllSatisfied(conditionsFor("valid").conditions, "X4 valid canonical expectation set");
    for (const [label, variant] of [
      ["V1 payload mutation", 0],
      ["R1 payload mutation", 1],
      ["R2 payload mutation", 2],
      ["R3 payload mutation", 3],
      ["incomplete comparison", "incomplete"],
      ["extra freeze-record entry", "extra"],
      ["duplicate freeze-record entry", "duplicate"],
      ["substituted freeze-record path", "substituted-path"],
      ["substituted freeze-record digest", "substituted-digest"],
      ["unverifiable comparison", "unverifiable"]
    ]) {
      const result = conditionsFor(variant);
      requireRejected(result.conditions, `X4 ${label}`);
      result.restore?.();
    }
  });
});

test("F3 rejects duplicate file-set entries and malformed or missing frozen blobs", () => {
  const helper = requireFreezeHelper("freezeServicesTreeDigestConditions");
  withTempRoot((root) => {
    const { services, frozenCommit } = initItem5GitFixture(root);
    const valid = { servicesTreeDigest: services.digest, servicesTreeFileSet: services.paths };
    const duplicate = clone(valid);
    duplicate.servicesTreeFileSet.push(services.paths[0]);
    requireRejected(helper(duplicate, "f3.duplicate", item5Gi(), root, frozenCommit), "F3 duplicate file-set entry");
    requireRejected(helper(valid, "f3.malformed", item5Gi(), root, "not-a-commit"), "F3 malformed frozen commit/blob anchor");
  });
  withTempRoot((root) => {
    fixtureGit(root, "init", "--quiet", "--initial-branch=main");
    fixtureGit(root, "config", "user.email", "qa@tina.invalid");
    fixtureGit(root, "config", "user.name", "TINA QA");
    const services = governedServicesFixture(root);
    fs.rmSync(path.join(root, ...services.paths[0].split("/")));
    const frozenCommit = commitFixture(root, "freeze with a missing governed blob");
    requireRejected(
      helper(
        { servicesTreeDigest: services.digest, servicesTreeFileSet: services.paths },
        "f3.missing-blob",
        item5Gi(),
        root,
        frozenCommit
      ),
      "F3 governed path missing from frozen commit"
    );
  });
});

test("F4 accepts a root false transition but rejects side-branch and worktree-only claims", () => {
  const helper = requireFreezeHelper("freezeRuntimeMutabilityConditions");
  withTempRoot((root) => {
    fixtureGit(root, "init", "--quiet", "--initial-branch=main");
    fixtureGit(root, "config", "user.email", "qa@tina.invalid");
    fixtureGit(root, "config", "user.name", "TINA QA");
    writeJsonRef(root, FREEZE_MANIFEST_REL, { runtimeMutable: true });
    const runtimeCommit = commitFixture(root, "root runtime baseline");
    writeJsonRef(root, FREEZE_MANIFEST_REL, runtimeMutableFalseRecord({ frozenCommit: runtimeCommit }));
    commitFixture(root, "root-ancestry first false freeze record");
    requireAllSatisfied(
      helper(runtimeMutableFalseRecord({ frozenCommit: runtimeCommit }), "f4.root-false", item5Gi(), root, runtimeCommit),
      "F4 root-commit first false"
    );
  });
  withTempRoot((root) => {
    fixtureGit(root, "init", "--quiet", "--initial-branch=main");
    fixtureGit(root, "config", "user.email", "qa@tina.invalid");
    fixtureGit(root, "config", "user.name", "TINA QA");
    writeJsonRef(root, FREEZE_MANIFEST_REL, { runtimeMutable: true });
    const primary = commitFixture(root, "primary mutable baseline");
    const primaryBranch = fixtureGit(root, "branch", "--show-current");
    fixtureGit(root, "checkout", "--quiet", "-b", "false-only-side-branch");
    writeJsonRef(root, FREEZE_MANIFEST_REL, runtimeMutableFalseRecord({ frozenCommit: primary }));
    commitFixture(root, "false only on side branch");
    fixtureGit(root, "checkout", "--quiet", primaryBranch);
    writeFixture(root, "primary-only.txt", Buffer.from("primary history continues\n"));
    commitFixture(root, "primary continuation");
    fixtureGit(root, "merge", "--quiet", "--no-ff", "-s", "ours", "false-only-side-branch", "-m", "merge side false without adopting it");
    writeJsonRef(root, FREEZE_MANIFEST_REL, runtimeMutableFalseRecord({ frozenCommit: primary, firstFalseCommit: primary }));
    commitFixture(root, "downstream freeze manifest after side merge");
    requireRejected(
      helper(runtimeMutableFalseRecord({ frozenCommit: primary, firstFalseCommit: primary }), "f4.non-first-parent", item5Gi(), root, primary),
      "F4 false visible only on a non-first-parent ancestor"
    );
  });
  withTempRoot((root) => {
    fixtureGit(root, "init", "--quiet", "--initial-branch=main");
    fixtureGit(root, "config", "user.email", "qa@tina.invalid");
    fixtureGit(root, "config", "user.name", "TINA QA");
    writeJsonRef(root, FREEZE_MANIFEST_REL, { runtimeMutable: true });
    const runtimeCommit = commitFixture(root, "committed mutable baseline");
    writeJsonRef(root, FREEZE_MANIFEST_REL, runtimeMutableFalseRecord({ frozenCommit: runtimeCommit }));
    requireRejected(
      helper(runtimeMutableFalseRecord({ frozenCommit: runtimeCommit, firstFalseCommit: runtimeCommit }), "f4.worktree-only", item5Gi(), root, runtimeCommit),
      "F4 uncommitted false assertion cannot create a history transition"
    );
  });
});

test("F6/A3 rejects non-ancestor freezes, digest lies, non-exact sets, and deleted governed paths", () => {
  const helper = requireFreezeHelper("freezeDriftVerificationConditions");
  withTempRoot((root) => {
    const { services, frozenCommit } = initItem5GitFixture(root);
    const governedPath = services.paths[0];
    const governedBytes = fs.readFileSync(path.join(root, ...governedPath.split("/")));
    const a3Rel = "evidence/A3-extra-mutations.json";
    const discardA3 = () => fs.rmSync(path.join(root, ...a3Rel.split("/")), { force: true });
    const writeA3 = (fromCommit = frozenCommit, paths = services.paths) => writeJsonRef(root, a3Rel, {
      fromCommit,
      toCommit: fixtureGit(root, "rev-parse", "HEAD"),
      governedRuntimeSet: paths
    });
    const conditionsFor = (variant) => {
      discardA3();
      let effectiveFrozen = frozenCommit;
      let restore = null;
      if (variant === "deleted") {
        fs.rmSync(path.join(root, ...governedPath.split("/")));
        commitFixture(root, "delete governed path after freeze");
        restore = () => {
          discardA3();
          writeFixture(root, governedPath, governedBytes);
          commitFixture(root, "restore deleted governed path");
        };
      }
      if (variant === "non-ancestor") {
        const primaryBranch = fixtureGit(root, "branch", "--show-current");
        fixtureGit(root, "checkout", "--quiet", "--orphan", "disconnected-freeze");
        writeFixture(root, "disconnected-marker.txt", Buffer.from("disconnected history\n"));
        effectiveFrozen = commitFixture(root, "disconnected freeze");
        fixtureGit(root, "checkout", "--quiet", primaryBranch);
      }
      const paths = variant === "duplicate"
        ? [...services.paths, services.paths[0]]
        : variant === "extra" ? [...services.paths, "unexpected-governed.js"] : services.paths;
      const a3 = writeA3(effectiveFrozen, paths);
      const man = { postFreezeDriftVerification: { artifactPath: a3.path, sha256: a3.sha256 } };
      if (variant === "digest-mismatch") man.postFreezeDriftVerification.sha256 = "0".repeat(64);
      return { conditions: helper(man, `f6.${variant}`, item5Gi(), root, effectiveFrozen), restore };
    };

    for (const variant of ["digest-mismatch", "duplicate", "extra", "deleted", "non-ancestor"]) {
      const result = conditionsFor(variant);
      requireRejected(result.conditions, `F6/A3 ${variant}`);
      discardA3();
      result.restore?.();
    }
  });
});

test("X4 rejects criteria disagreement, reordering, wrong pins, and matching-but-unpinned bytes", () => {
  const helper = requireFreezeHelper("freezeOracleExpectationImmutabilityConditions");
  withTempRoot((root) => {
    fixtureGit(root, "init", "--quiet", "--initial-branch=main");
    fixtureGit(root, "config", "user.email", "qa@tina.invalid");
    fixtureGit(root, "config", "user.name", "TINA QA");
    const set = CANONICAL_EXPECTATIONS.map(([rel, sha256]) => {
      writeFixture(root, rel, fs.readFileSync(abs(rel)));
      return { path: rel, sha256 };
    });
    const frozenCommit = commitFixture(root, "freeze exact oracle set");
    for (const variant of ["criteria-mismatch", "reordered", "wrong-declared-digest", "matching-but-unpinned"]) {
      const gi = item5Gi();
      gi.criteria.criteria.frozenRuntime.canonicalExpectationSet = clone(set);
      const man = { canonicalExpectationSet: clone(set) };
      if (variant === "criteria-mismatch") gi.criteria.criteria.frozenRuntime.canonicalExpectationSet[0].sha256 = "0".repeat(64);
      if (variant === "reordered") man.canonicalExpectationSet.reverse();
      if (variant === "wrong-declared-digest") man.canonicalExpectationSet[0].sha256 = "0".repeat(64);
      if (variant === "matching-but-unpinned") {
        gi.criteria.criteria.frozenRuntime.canonicalExpectationSet[0].sha256 = "0".repeat(64);
        man.canonicalExpectationSet[0].sha256 = "0".repeat(64);
      }
      requireRejected(helper(man, `x4.${variant}`, gi, root, frozenCommit), `X4 ${variant}`);
    }
  });
});

test("all four new freeze controls are attached to the Item-5 result", () => {
  const item5 = ITEM("frozenRuntime");
  for (const family of [
    "freeze.servicesTreeDigest",
    "freeze.runtimeMutability",
    "freeze.postFreezeDriftVerification",
    "freeze.oracleExpectationImmutability",
    "freeze.postFreezeRuntimeHistory",
    "freeze.oracleExpectationHistory"
  ]) {
    check(
      item5.conditions.some((condition) => condition.id.startsWith(family)),
      `${family} contributes executable Item-5 conditions`
    );
  }
});

// ── Finding A mutations: the Git batch reader must fail closed as a whole ───

function batchAnswerBytes(oid, payload) {
  return Buffer.concat([
    Buffer.from(`${oid} blob ${payload.length}\n`, "utf8"), payload, Buffer.from("\n", "utf8")
  ]);
}

test("Git batch trailing bytes and malformed headers invalidate every already-parsed answer", () => {
  check(typeof S.parseItem5GitBatchAnswers === "function", "runner exports parseItem5GitBatchAnswers(specs, stdout)");
  const parse = S.parseItem5GitBatchAnswers;
  const specs = ["abc:def-a", "abc:def-b"];
  const payloads = [Buffer.from("first governed payload\n"), Buffer.from("second governed payload\n")];
  const cleanStdout = Buffer.concat([
    batchAnswerBytes("1".repeat(40), payloads[0]),
    batchAnswerBytes("2".repeat(40), payloads[1])
  ]);

  const clean = parse(specs, cleanStdout);
  check(clean.wholeBatchValid === true && clean.anomaly === null, "control: an exact batch parses validly");
  check(clean.answers.length === 2 && clean.answers.every((answer) => answer.ok === true),
    "control: both answers resolve before any corruption");

  for (const [label, tail] of [["one stray byte", Buffer.from("X")], ["one stray newline", Buffer.from("\n")]]) {
    const result = parse(specs, Buffer.concat([cleanStdout, tail]));
    check(result.wholeBatchValid === false, `trailing ${label} invalidates the whole batch`);
    check(typeof result.anomaly === "string" && result.anomaly.includes("trailing bytes"),
      `trailing ${label} is reported as trailing bytes beyond the requested answers`);
    check(result.answers.length === specs.length, `trailing ${label}: one verdict per requested spec`);
    check(result.answers.every((answer) =>
      answer.ok === false && answer.oid === null && answer.bytes === null && typeof answer.detail === "string"),
      `trailing ${label}: no previously parsed ok answer survives`);
  }

  const midMalformed = Buffer.concat([
    batchAnswerBytes("1".repeat(40), payloads[0]),
    Buffer.from(`abc:def-b missing\n`, "utf8")
  ]);
  const midResult = parse(specs, midMalformed);
  check(midResult.wholeBatchValid === false, "a malformed second header invalidates the whole batch");
  check(midResult.answers.every((answer) => answer.ok === false && answer.bytes === null),
    "the cleanly parsed first answer does not survive a malformed sibling");
});

test("Git batch cardinality mismatch retains nothing", () => {
  const parse = S.parseItem5GitBatchAnswers;
  const specs = ["abc:def-a", "abc:def-b"];
  const payload = Buffer.from("governed bytes\n");

  const truncated = parse(specs, batchAnswerBytes("1".repeat(40), payload));
  check(truncated.wholeBatchValid === false, "fewer answers than specs invalidates the batch");
  check(truncated.anomaly.includes("truncated Git batch header"), "missing second header is reported");
  check(truncated.answers.length === 2 && truncated.answers.every((answer) => answer.ok === false),
    "truncated batch retains nothing");

  const extraAnswer = Buffer.concat([
    batchAnswerBytes("1".repeat(40), payload),
    batchAnswerBytes("2".repeat(40), payload),
    batchAnswerBytes("3".repeat(40), payload)
  ]);
  const surplus = parse(specs, extraAnswer);
  check(surplus.wholeBatchValid === false, "more answers than specs invalidates the batch");
  check(surplus.answers.length === 2 && surplus.answers.every((answer) => answer.ok === false),
    "surplus batch retains nothing");
});

function initBatchConsumerFixture(root) {
  fixtureGit(root, "init", "--quiet", "--initial-branch=main");
  fixtureGit(root, "config", userConfig()[0], userConfig()[1]);
  fixtureGit(root, "config", userConfig()[2], userConfig()[3]);
}
function userConfig() {
  return ["user.email", "qa@tina.invalid", "user.name", "TINA QA"];
}
function committedBlobOid(root, commit, relPath) {
  return fixtureGit(root, "rev-parse", `${commit}:${relPath}`);
}
function corruptCommittedBlob(root, commit, relPath, tag) {
  const oid = committedBlobOid(root, commit, relPath);
  const objectPath = path.join(root, ".git", "objects", oid.slice(0, 2), oid.slice(2));
  check(fs.existsSync(objectPath), `loose object for ${relPath} exists before corruption (${tag})`);
  fs.chmodSync(objectPath, 0o666); // git stores loose objects read-only
  fs.writeFileSync(objectPath, Buffer.from(`corrupted payload defeats zlib inflation (${tag})\n`, "utf8"));
}

test("F3 cannot pass on a Git batch whose frozen blob proof failed closed", () => {
  const helper = requireFreezeHelper("freezeServicesTreeDigestConditions");
  withTempRoot((root) => {
    const { services, frozenCommit } = initItem5GitFixture(root);
    const valid = { servicesTreeDigest: services.digest, servicesTreeFileSet: services.paths };
    requireAllSatisfied(helper(valid, "f3.batch.sanity", item5Gi(), root, frozenCommit), "F3 sanity before corruption");
    corruptCommittedBlob(root, frozenCommit, services.paths[0], "f3-batch");
    const conditions = helper(valid, "f3.batch", item5Gi(), root, frozenCommit);
    requireRejected(conditions, "F3 invalidated Git batch cannot satisfy the digest proof");
    check(byId(conditions, "f3.batch.servicesTreeDigest.approvedExactUniqueSetAvailable").satisfied === true,
      "F3 rejection comes from the blob-proof leg, not from missing definitions");
    check(byId(conditions, "f3.batch.servicesTreeDigest.allFrozenBlobsResolvable").satisfied === false,
      "F3 whole-batch failure marks every frozen blob unresolvable");
  });
});

test("F4 cannot pass when the committed freeze-record blob is unreadable", () => {
  const helper = requireFreezeHelper("freezeRuntimeMutabilityConditions");
  withTempRoot((root) => {
    initBatchConsumerFixture(root);
    writeJsonRef(root, FREEZE_MANIFEST_REL, { [RUNTIME_MUTABLE_FIELD]: true });
    const runtimeCommit = commitFixture(root, "runtime baseline before unreadable record");
    writeJsonRef(root, FREEZE_MANIFEST_REL, runtimeMutableFalseRecord({ frozenCommit: runtimeCommit }));
    commitFixture(root, "committed freeze record later corrupted");
    const man = runtimeMutableFalseRecord({ frozenCommit: runtimeCommit });
    requireAllSatisfied(helper(man, "f4.batch.sanity", item5Gi(), root, runtimeCommit), "F4 sanity before corruption");
    corruptCommittedBlob(root, fixtureGit(root, "rev-parse", "HEAD"), FREEZE_MANIFEST_REL, "f4-batch");
    const conditions = helper(man, "f4.batch", item5Gi(), root, runtimeCommit);
    requireRejected(conditions, "F4 unreadable committed record cannot pass");
    check(byId(conditions, "f4.batch.runtimeMutability.committedHeadRecordParsed").satisfied === false,
      "F4 fail-closed because the HEAD freeze-record blob could not be resolved");
  });
});

test("F6 cannot pass when committed governed blobs are unreadable despite clean endpoints", () => {
  const helper = requireFreezeHelper("freezeDriftVerificationConditions");
  withTempRoot((root) => {
    const { services, frozenCommit } = initItem5GitFixture(root);
    const governedPath = services.paths[0];
    const a3 = writeJsonRef(root, "evidence/A3-f6-batch.json", {
      fromCommit: frozenCommit,
      toCommit: fixtureGit(root, "rev-parse", "HEAD"),
      governedRuntimeSet: services.paths
    });
    const man = { postFreezeDriftVerification: { artifactPath: a3.path, sha256: a3.sha256 } };
    requireAllSatisfied(helper(man, "f6.batch.sanity", item5Gi(), root, frozenCommit), "F6 sanity before corruption");
    corruptCommittedBlob(root, frozenCommit, governedPath, "f6-batch");
    const conditions = helper(man, "f6.batch", item5Gi(), root, frozenCommit);
    requireRejected(conditions, "F6 invalidated Git batch cannot prove endpoint equality");
    check(byId(conditions, "f6.batch.postFreezeDriftVerification.digestPinned").satisfied === true,
      "F6 retained evidence itself stays verifiable; the batch proof is what fails");
    check(byId(conditions, "f6.batch.postFreezeDriftVerification.everyCommittedBlobUnchanged").satisfied === false,
      "F6 whole-batch failure blocks the every-blob-unchanged conclusion");
  });
});

test("X4 cannot pass when pinned oracle blobs are unreadable", () => {
  const helper = requireFreezeHelper("freezeOracleExpectationImmutabilityConditions");
  withTempRoot((root) => {
    initBatchConsumerFixture(root);
    const canonicalExpectationSet = CANONICAL_EXPECTATIONS.map(([rel, expectedSha]) => {
      const bytes = fs.readFileSync(abs(rel));
      check(sha256(bytes) === expectedSha, `canonical fixture source ${rel} has its owner-approved digest`);
      writeFixture(root, rel, bytes);
      return { path: rel, sha256: expectedSha };
    });
    const frozenCommit = commitFixture(root, "freeze canonical expectations for batch corruption");
    const gi = item5Gi();
    gi.criteria.criteria.frozenRuntime.canonicalExpectationSet = clone(canonicalExpectationSet);
    const man = { canonicalExpectationSet: clone(canonicalExpectationSet) };
    requireAllSatisfied(helper(man, "x4.batch.sanity", gi, root, frozenCommit), "X4 sanity before corruption");
    corruptCommittedBlob(root, frozenCommit, canonicalExpectationSet[0].path, "x4-batch");
    const conditions = helper(man, "x4.batch", gi, root, frozenCommit);
    requireRejected(conditions, "X4 invalidated Git batch cannot verify pinned digests");
    check(byId(conditions, "x4.batch.oracleExpectationImmutability.criteriaExactPinnedSet").satisfied === true,
      "X4 rejection comes from blob proof, not from set definitions");
    check(byId(conditions, "x4.batch.oracleExpectationImmutability.frozenAndHeadBlobsEqualPins").satisfied === false,
      "X4 whole-batch failure blocks the pins-equal conclusion");
  });
});

// ── Owner §2.5 X1/X4 history-semantics mutations ────────────────────────────

function initOracleHistoryFixture(root) {
  initBatchConsumerFixture(root);
  const canonicalBytes = new Map();
  for (const [rel, expectedSha] of CANONICAL_EXPECTATIONS) {
    const bytes = fs.readFileSync(abs(rel));
    check(sha256(bytes) === expectedSha, `canonical fixture source ${rel} has its owner-approved digest`);
    canonicalBytes.set(rel, bytes);
    writeFixture(root, rel, bytes);
  }
  const frozenCommit = commitFixture(root, "freeze oracle expectation set");
  return { canonicalBytes, frozenCommit };
}

test("X1 passes untouched governed runtime history after the freeze", () => {
  const helper = requireFreezeHelper("freezePostFreezeRuntimeHistoryConditions");
  withTempRoot((root) => {
    const { frozenCommit } = initItem5GitFixture(root);
    writeFixture(root, "unrelated-later-head.txt", Buffer.from("later unrelated commit\n"));
    commitFixture(root, "unrelated commit after freeze");
    const conditions = helper({}, "x1.clean", item5Gi(), root, frozenCommit);
    requireAllSatisfied(conditions, "X1 untouched governed runtime history satisfies every condition");
    check(byId(conditions, "x1.clean.postFreezeRuntimeHistory.noGovernedRuntimeChangeAfterFreeze").satisfied === true,
      "no governed runtime path changed after the freeze");
  });
});

test("X1 fails a governed change-then-restore after the freeze while the F6 endpoint check stays clean", () => {
  const x1 = requireFreezeHelper("freezePostFreezeRuntimeHistoryConditions");
  const f6 = requireFreezeHelper("freezeDriftVerificationConditions");
  withTempRoot((root) => {
    const { services, frozenCommit } = initItem5GitFixture(root);
    const governedPath = services.paths[0];
    const target = path.join(root, ...governedPath.split("/"));
    const original = fs.readFileSync(target);
    fs.appendFileSync(target, "X1 post-freeze governed edit, restored later\n");
    commitFixture(root, "edit governed runtime after freeze");
    writeFixture(root, governedPath, original);
    commitFixture(root, "restore governed runtime bytes");

    const x1Conditions = x1({}, "x1.restored", item5Gi(), root, frozenCommit);
    requireRejected(x1Conditions, "X1 rejects a governed runtime edit even though bytes were restored");
    check(byId(x1Conditions, "x1.restored.postFreezeRuntimeHistory.postFreezeHistoryFullyScanned").satisfied === true,
      "the full-history scan completed, so the violation comes from detected commits");
    check(byId(x1Conditions, "x1.restored.postFreezeRuntimeHistory.noGovernedRuntimeChangeAfterFreeze").satisfied === false,
      "restoring bytes later does not discharge the X1 history violation");

    const a3 = writeJsonRef(root, "evidence/A3-x1-contrast.json", {
      fromCommit: frozenCommit,
      toCommit: fixtureGit(root, "rev-parse", "HEAD"),
      governedRuntimeSet: services.paths
    });
    const f6Conditions = f6(
      { postFreezeDriftVerification: { artifactPath: a3.path, sha256: a3.sha256 } },
      "x1.restored.f6", item5Gi(), root, frozenCommit
    );
    requireAllSatisfied(f6Conditions, "F6 endpoint current-drift stays clean on restored bytes");
  });
});

test("X1 catches a governed edit-and-restore committed on a side branch and merged back", () => {
  // Default pathspec simplification prunes side-branch edits whose bytes were
  // restored before the merge, so this fixture is what proves --full-history
  // is load-bearing in scanPostFreezePathHistory.
  const x1 = requireFreezeHelper("freezePostFreezeRuntimeHistoryConditions");
  withTempRoot((root) => {
    const { services, frozenCommit } = initItem5GitFixture(root);
    const governedPath = services.paths[0];
    const target = path.join(root, ...governedPath.split("/"));
    const original = fs.readFileSync(target);
    fixtureGit(root, "checkout", "--quiet", "-b", "side-edit-after-freeze");
    fs.appendFileSync(target, "X1 side-branch governed edit, restored before merge\n");
    commitFixture(root, "edit governed runtime on side branch after freeze");
    writeFixture(root, governedPath, original);
    commitFixture(root, "restore governed runtime bytes on side branch");
    fixtureGit(root, "checkout", "--quiet", "main");
    fixtureGit(root, "merge", "--quiet", "--no-ff", "-m", "merge restored side branch", "side-edit-after-freeze");

    const conditions = x1({}, "x1.sidebranch", item5Gi(), root, frozenCommit);
    requireRejected(conditions, "X1 detects the side-branch edit-and-restore through the merge");
    check(byId(conditions, "x1.sidebranch.postFreezeRuntimeHistory.postFreezeHistoryFullyScanned").satisfied === true,
      "the full-history scan completed across the merged side branch");
    check(byId(conditions, "x1.sidebranch.postFreezeRuntimeHistory.noGovernedRuntimeChangeAfterFreeze").satisfied === false,
      "history simplification cannot hide a side-branch post-freeze governed edit from X1");
  });
});

test("X4 passes untouched oracle expectation history after the freeze", () => {
  const helper = requireFreezeHelper("freezeOracleExpectationHistoryConditions");
  withTempRoot((root) => {
    const { frozenCommit } = initOracleHistoryFixture(root);
    writeFixture(root, "unrelated-oracle-era-commit.txt", Buffer.from("later unrelated commit\n"));
    commitFixture(root, "unrelated commit after oracle freeze");
    const conditions = helper({}, "x4h.clean", item5Gi(), root, frozenCommit);
    requireAllSatisfied(conditions, "X4 untouched oracle expectation history satisfies every condition");
    check(byId(conditions, "x4h.clean.oracleExpectationHistory.noOracleExpectationEditAfterFreeze").satisfied === true,
      "no pinned expectation path was edited after the freeze");
  });
});

test("X4 fails each pinned V1/R1/R2/R3 expectation edited-and-restored after the freeze", () => {
  const helper = requireFreezeHelper("freezeOracleExpectationHistoryConditions");
  for (const [index, [rel]] of CANONICAL_EXPECTATIONS.entries()) {
    const label = index === 0 ? "V1" : `R${index}`;
    withTempRoot((root) => {
      const { canonicalBytes, frozenCommit } = initOracleHistoryFixture(root);
      const target = path.join(root, ...rel.split("/"));
      fs.appendFileSync(target, `\nX4 post-freeze ${label} expectation edit, restored later\n`);
      commitFixture(root, `edit ${label} expectation after freeze`);
      writeFixture(root, rel, canonicalBytes.get(rel));
      commitFixture(root, `restore ${label} expectation bytes`);

      const conditions = helper({}, `x4h.${label}`, item5Gi(), root, frozenCommit);
      requireRejected(conditions, `X4 rejects the ${label} expectation edit even though bytes were restored`);
      check(byId(conditions, `x4h.${label}.oracleExpectationHistory.postFreezeHistoryFullyScanned`).satisfied === true,
        `${label}: the full-history scan completed, so the violation comes from detected commits`);
      check(byId(conditions, `x4h.${label}.oracleExpectationHistory.noOracleExpectationEditAfterFreeze`).satisfied === false,
        `${label}: reverting to the pinned bytes does not discharge the X4 history violation`);
    });
  }
});

console.log(
  "\nPHASE-10A-CLOSURE-V1-SUCCESSOR-GATE-1 tests: " + passed + " passed, " + failed + " failed, " +
    assertions + " assertions"
);
process.exitCode = failed > 0 ? 1 : 0;
