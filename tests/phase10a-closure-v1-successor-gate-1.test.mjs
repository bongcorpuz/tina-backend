// PHASE-10A-CLOSURE-V1-SUCCESSOR-GATE-1 - behavioral suite for
// evaluation/runner/phase10a-closure-v1/phase10a-a15-successor-gate.mjs.
//
// The successor closure gate makes two claims that would be dangerous if
// unverified: that it can represent an end-to-end PASS (unlike A15 V1), and
// that it nevertheless refuses to produce one today. A suite that only checked
// the first would be worse than no suite at all, so the coverage here is
// deliberately balanced:
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
// No network. No writes anywhere: every write-path assertion is made against
// the boundary function and the output-mode refusals, none of which reach a
// filesystem write, and the gate is evaluated in REPORT_ONLY mode.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import * as S from "../evaluation/runner/phase10a-closure-v1/phase10a-a15-successor-gate.mjs";
import * as V1 from "../evaluation/runner/phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const V1_REL = "evaluation/runner/phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs";
// Digest of A15 V1 as committed at the authoring base commit
// 0de779cd529271b9235eba3a1e4a8b051bf4c987. This suite fails if the successor
// work unit ever edits V1, which is the whole point of a forward-only successor.
const V1_SHA = "07b4be961c631ac84c06cc8695e9afdc35f82eb3ce4ae8d0513bb6c64efd9033";

const ALLOWED_OUT = "evaluation/results/phase10a-closure-v1";
const CRITERIA_REL = `${ALLOWED_OUT}/PHASE10A_APPROVED_EXIT_CRITERIA_V1.json`;

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

// One evaluation, reused: it is deterministic and read-only, and re-running it
// per test would only slow the suite down.
const RESULT = S.evaluate(REPO_ROOT);
const ITEM = (id) => {
  const found = RESULT.itemResults.find((r) => r.id === id);
  assert(found, `no item result '${id}'`);
  return found;
};
const CRITERIA = JSON.parse(fs.readFileSync(abs(CRITERIA_REL), "utf8"));

// ---------------------------------------------------------------------------
// 1. Forward-only additivity
// ---------------------------------------------------------------------------

test("A15 V1 is byte-identical to its committed form", () => {
  const bytes = fs.readFileSync(abs(V1_REL));
  check(
    createHash("sha256").update(bytes).digest("hex") === V1_SHA,
    "A15 V1 must not be modified by the successor work unit"
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

test("declared PASS reachability equals what the catalogue derives", () => {
  const derived = S.computePassReachability();
  check(derived.currentCheckCatalogueCanProducePass === true, "the catalogue can represent an end-to-end PASS");
  check(
    derived.itemsThatCannotCurrentlyProducePass.length === 0,
    `no item lacks a PASS branch; offenders: ${derived.itemsThatCannotCurrentlyProducePass.join(", ")}`
  );
  check(S.SUCCESSOR_CONTRACT.passReachability.status === "PASS_CAPABLE", "declaration matches");
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
  check(item.subChecks.find((s) => s.id === "integrated").stagingAttributionRequired === true,
    "the integrated subcheck requires staging attribution (D6)");
  const result = ITEM("standaloneAndIntegratedExactGates");
  check(result.subCheckResults.length === 2, "both subchecks are evaluated, not short-circuited");
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

// ---------------------------------------------------------------------------
// 4. Today's honest verdict against the real repository
// ---------------------------------------------------------------------------

test("the run is BLOCKED and claims nothing", () => {
  check(RESULT.executionStatus === "BLOCKED", `executionStatus is BLOCKED (got ${RESULT.executionStatus})`);
  check(RESULT.blockedReason === "PRECONDITION_UNSATISFIED", `blockedReason (got ${RESULT.blockedReason})`);
  check(RESULT.phase10AClosure === "NOT_CLAIMED", "Phase 10A is not claimed closed");
  check(RESULT.phase10BAuthorization === "NOT_CLAIMED", "Phase 10B is not authorized");
  check(RESULT.reviewDisposition === "PENDING_INTERNAL_REVIEW", "the runner cannot set any other disposition");
  check(S.SUCCESSOR_CONTRACT.phase10AClosure.autoClose === false, "a PASS would still not close Phase 10A");
});

test("both governed inputs verify against their pinned digests", () => {
  check(RESULT.governedInputs.authorization.matched === true, "authorization digest pinned");
  check(RESULT.governedInputs.approvedCriteria.matched === true, "approved-criteria digest pinned");
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
});

test("provenance is recorded without being enforced as an equality gate", () => {
  const base = S.SUCCESSOR_CONTRACT.inputsAndPrerequisites.authoringBaseHead;
  check(base.enforced === false, "the authoring base commit is provenance, not a precondition");
  check(base.role === "PROVENANCE_RECORD", "declared as a provenance record");
  check(RESULT.preflight.observedHead.present === true, "the observed head is captured into the evidence");
  check(/^[0-9a-f]{40}$/.test(RESULT.preflight.observedHead.commit), "as a full commit id");
  check(RESULT.preflight.canonicalEolPolicy === "CRLF_TO_LF_ONLY", "the canonical EOL policy is recorded");
});

console.log(
  "\nPHASE-10A-CLOSURE-V1-SUCCESSOR-GATE-1 tests: " + passed + " passed, " + failed + " failed, " +
    assertions + " assertions"
);
process.exitCode = failed > 0 ? 1 : 0;
