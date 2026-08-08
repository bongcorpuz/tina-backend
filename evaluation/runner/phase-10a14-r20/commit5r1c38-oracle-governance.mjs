import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const EXPECTED_BRANCH = "feature/source-availability-engine-v1";
const EXPECTED_HEAD = "9b44d7e01249671eeb272e27f6eb3ba2b8c2ab88";
const ROOT = process.cwd();
const R4_DIR = "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r4";
const RESULT_PATH =
  "evaluation/results/phase-10a14-r20/COMMIT_5R1C38_ORACLE_REVISION_RESULT.json";

const INPUTS = Object.freeze({
  v1: {
    path: "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json",
    sha256: "0227a5b4b6c2eb552427e002b6a66d50b39a06635c84f74798de81ffa608b263",
  },
  r1: {
    path:
      "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/R20_DEVELOPMENT_ORACLE_FROZEN_R1.json",
    sha256: "ba0163932fc64d59070d8bba93a23645d03598abb07d612cea25607684503f1f",
  },
  r2: {
    path:
      "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r2/R20_DEVELOPMENT_ORACLE_FROZEN_R2.json",
    sha256: "1347a918ee643723531438bfe6d305756c6a43feffbe042ac1ddb2c6bf6c8ccd",
  },
  r3: {
    path:
      "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json",
    sha256: "ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54",
  },
  reasonContract: {
    path:
      "evaluation/results/phase-10a14-r20/COMMIT_5R1C37_REASON_CONTRACT_SPECIFICATION.json",
    sha256: "41d185be42aacca00fdc67cd13b075ef1348cf0c46c12b157c0d9fc8ad72ca93",
  },
  rowAdjudication: {
    path:
      "evaluation/results/phase-10a14-r20/COMMIT_5R1C37_145_ROW_CONTRACT_ADJUDICATION.json",
    sha256: "74f30ec7a0a6bb0696323323c259659191299e123dd648c823a0da101acb684d",
  },
  necessityDecision: {
    path:
      "evaluation/results/phase-10a14-r20/COMMIT_5R1C37_RUNTIME_CANDIDATE_NECESSITY_DECISION.json",
    sha256: "b661a2e5bef88e2aa539e5a701ec0832550b8d2660a10a155db1b85f4856e983",
  },
});

const R4_FILES = Object.freeze([
  "R20_DEVELOPMENT_ORACLE_FROZEN_R4.json",
  "R20_DEVELOPMENT_ORACLE_R4_FREEZE.json",
  "R20_DEVELOPMENT_ORACLE_R4_INDEX.json",
  "R20_DEVELOPMENT_ORACLE_R4_SUPERSESSION_RECORD.json",
  "R20_REASON_FAMILY_R4_SOURCE_LOCK.json",
  "R20_REASON_FAMILY_R4_CHANGESET.json",
  "R20_REASON_FAMILY_R4_ADJUDICATION.json",
  "R20_REASON_FAMILY_R4_CHALLENGE_REGISTER.json",
  "R20_REASON_FAMILY_R4_RESOLUTION_REGISTER.json",
  "R20_REASON_FAMILY_R4_ANALYZER_CONTAMINATION_AUDIT.json",
  "R20_REASON_FAMILY_R4_UNCHANGED_FIELD_PROOF.json",
  "R20_REASON_FAMILY_R4_REASON_DISTRIBUTION.json",
]);

let writesStarted = false;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function abs(relativePath) {
  const resolved = path.resolve(ROOT, relativePath);
  const relative = path.relative(ROOT, resolved);
  assert(
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative),
    `path escapes repository root: ${relativePath}`,
  );
  return resolved;
}

function sha256(bufferOrString) {
  return crypto.createHash("sha256").update(bufferOrString).digest("hex");
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function git(...args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  assert(result.status === 0, `git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function readLockedInputs() {
  const locked = {};
  for (const [name, expected] of Object.entries(INPUTS)) {
    const filePath = abs(expected.path);
    assert(fs.existsSync(filePath), `missing governed input: ${expected.path}`);
    const bytes = fs.readFileSync(filePath);
    const actualSha256 = sha256(bytes);
    assert(
      actualSha256 === expected.sha256,
      `governed input hash mismatch for ${expected.path}: expected ${expected.sha256}, got ${actualSha256}`,
    );
    let value;
    try {
      value = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      fail(`invalid JSON in governed input ${expected.path}: ${error.message}`);
    }
    locked[name] = {
      path: expected.path,
      sha256: actualSha256,
      bytes: bytes.length,
      value,
    };
  }
  return locked;
}

function assertPreWriteState() {
  const rootFromGit = path.resolve(git("rev-parse", "--show-toplevel"));
  assert(
    rootFromGit.toLowerCase() === path.resolve(ROOT).toLowerCase(),
    `runner must execute from repository root ${rootFromGit}`,
  );
  assert(git("branch", "--show-current") === EXPECTED_BRANCH, "unexpected branch");
  assert(git("rev-parse", "HEAD") === EXPECTED_HEAD, "unexpected HEAD");
  assert(git("diff", "--cached", "--name-only") === "", "staged changes are not allowed");

  assert(!fs.existsSync(abs(R4_DIR)), `path collision: ${R4_DIR}`);
  assert(!fs.existsSync(abs(RESULT_PATH)), `path collision: ${RESULT_PATH}`);
  for (const fileName of R4_FILES) {
    assert(!fs.existsSync(abs(`${R4_DIR}/${fileName}`)), `path collision: ${R4_DIR}/${fileName}`);
  }
}

function reasonDistribution(rows) {
  const distribution = {};
  for (const row of rows) {
    const reason = row.expectedReasonCodeFamily;
    distribution[reason] = (distribution[reason] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(distribution).sort(([a], [b]) => a.localeCompare(b)));
}

function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const key = selector(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function buildArtifacts(locked) {
  const generatedUtc = new Date().toISOString();
  const r3 = locked.r3.value;
  const adjudication = locked.rowAdjudication.value;
  const necessity = locked.necessityDecision.value;

  assert(r3.rowCount === 3720, `R3 metadata rowCount is ${r3.rowCount}, expected 3720`);
  assert(Array.isArray(r3.rows) && r3.rows.length === 3720, "R3 must contain exactly 3720 rows");
  assert(adjudication.rowCount === 145, "C37 adjudication rowCount must be 145");
  assert(adjudication.uniqueRows === 145, "C37 adjudication must identify 145 unique rows");
  assert(adjudication.duplicateRows === 0, "C37 adjudication contains duplicate rows");
  assert(adjudication.missingRows === 0, "C37 adjudication reports missing rows");
  assert(adjudication.allReasonOnly === true, "C37 adjudication is not reason-only");
  assert(adjudication.pass === true, "C37 adjudication is not passing");
  assert(
    necessity.decision === "C37_NO_RUNTIME_CANDIDATE_ORACLE_GOVERNANCE_REQUIRED" &&
      necessity.candidatesAuthorized === 0 &&
      necessity.candidatesAllocated === 0 &&
      necessity.pass === true,
    "C37 necessity decision does not authorize zero-candidate oracle governance",
  );

  const r3ById = new Map();
  for (const [index, row] of r3.rows.entries()) {
    assert(typeof row.oracleId === "string" && row.oracleId.length > 0, `R3 row ${index} has no oracleId`);
    assert(!r3ById.has(row.oracleId), `duplicate R3 oracleId: ${row.oracleId}`);
    r3ById.set(row.oracleId, { row, index });
  }

  const adjudicationById = new Map();
  for (const [index, item] of adjudication.rows.entries()) {
    const identity = item.stableRowIdentity;
    const oracleId = identity?.oracleId;
    assert(typeof oracleId === "string" && oracleId.length > 0, `adjudication row ${index} has no oracleId`);
    assert(!adjudicationById.has(oracleId), `duplicate adjudication oracleId: ${oracleId}`);
    assert(r3ById.has(oracleId), `adjudication oracleId is absent from R3: ${oracleId}`);

    const { row } = r3ById.get(oracleId);
    assert(row.query === item.exactQuery, `query mismatch for ${oracleId}`);
    assert(row.sourceSet === identity.sourceSet, `sourceSet mismatch for ${oracleId}`);
    assert(row.primaryCategory === identity.primaryCategory, `primaryCategory mismatch for ${oracleId}`);
    assert(row.expectedReasonCodeFamily === item.expected?.reason, `expected reason mismatch for ${oracleId}`);
    assert(row.expectedDecision === item.expected?.decision, `expected decision mismatch for ${oracleId}`);
    assert(item.actual?.decision === item.expected?.decision, `actual decision is not reason-only for ${oracleId}`);
    assert(
      typeof item.actual?.reason === "string" && item.actual.reason.length > 0,
      `missing sealed actual reason for ${oracleId}`,
    );
    assert(
      item.actual.reason !== row.expectedReasonCodeFamily,
      `adjudication does not change expected reason for ${oracleId}`,
    );
    adjudicationById.set(oracleId, item);
  }
  assert(adjudicationById.size === 145, "exactly 145 adjudication identities are required");

  const r4Rows = r3.rows.map((row) => {
    const item = adjudicationById.get(row.oracleId);
    return item ? { ...row, expectedReasonCodeFamily: item.actual.reason } : { ...row };
  });

  let changedRows = 0;
  let unchangedRows = 0;
  let unauthorizedFieldDifferences = 0;
  let queryChanges = 0;
  let decisionChanges = 0;
  let relationChanges = 0;
  let sourceChanges = 0;
  let categoryChanges = 0;
  let metamorphicChanges = 0;
  const changes = [];

  const sourceFields = ["sourceSet", "sourceRef", "sourceRowHash", "sourceFixtureId"];
  const categoryFields = ["coverageClass", "primaryCategory", "secondaryTags"];
  const metamorphicFields = ["metamorphicGroup", "metamorphicRole"];

  for (let index = 0; index < r3.rows.length; index += 1) {
    const before = r3.rows[index];
    const after = r4Rows[index];
    assert(before.oracleId === after.oracleId, `row order changed at index ${index}`);
    if (before.query !== after.query) queryChanges += 1;
    if (before.expectedDecision !== after.expectedDecision) decisionChanges += 1;
    if (!deepEqual(before.expectedRelations, after.expectedRelations)) relationChanges += 1;
    if (sourceFields.some((field) => !deepEqual(before[field], after[field]))) sourceChanges += 1;
    if (categoryFields.some((field) => !deepEqual(before[field], after[field]))) categoryChanges += 1;
    if (metamorphicFields.some((field) => !deepEqual(before[field], after[field]))) metamorphicChanges += 1;

    const differingKeys = Object.keys(before).filter((key) => !deepEqual(before[key], after[key]));
    const targeted = adjudicationById.has(before.oracleId);
    if (targeted) {
      assert(
        deepEqual(differingKeys, ["expectedReasonCodeFamily"]),
        `unauthorized target-row difference for ${before.oracleId}: ${differingKeys.join(",")}`,
      );
      assert(
        after.expectedReasonCodeFamily === adjudicationById.get(before.oracleId).actual.reason,
        `R4 reason does not equal sealed C37 actual reason for ${before.oracleId}`,
      );
      changedRows += 1;
      const item = adjudicationById.get(before.oracleId);
      changes.push({
        inventoryOrdinal: item.stableRowIdentity.inventoryOrdinal,
        oracleId: before.oracleId,
        sourceSet: before.sourceSet,
        primaryCategory: before.primaryCategory,
        previousExpectedReasonCodeFamily: before.expectedReasonCodeFamily,
        revisedExpectedReasonCodeFamily: after.expectedReasonCodeFamily,
        c37PrimaryCategory: item.primaryCategory,
        c37SecondaryCategory: item.secondaryCategory,
        expectedReasonUniquelyEntailedByQueryAndContract:
          item.expectedReasonUniquelyEntailedByQueryAndContract,
        runtimeCausalDistinguishability: item.runtimeCausalDistinguishability,
      });
    } else {
      assert(differingKeys.length === 0, `non-target row changed: ${before.oracleId}`);
      unchangedRows += 1;
    }
    unauthorizedFieldDifferences += differingKeys.filter(
      (key) => key !== "expectedReasonCodeFamily" || !targeted,
    ).length;
  }

  assert(changedRows === 145, `changed ${changedRows} rows, expected 145`);
  assert(unchangedRows === 3575, `preserved ${unchangedRows} rows, expected 3575`);
  assert(unauthorizedFieldDifferences === 0, "unauthorized field differences detected");
  assert(
    [queryChanges, decisionChanges, relationChanges, sourceChanges, categoryChanges, metamorphicChanges].every(
      (count) => count === 0,
    ),
    "a protected row field changed",
  );

  const r4 = {
    task: "PHASE-10A14-R20",
    version: "reason-family-r4",
    derivedFromPath: locked.r3.path,
    derivedFromSha256: locked.r3.sha256,
    reasonContractPath: locked.reasonContract.path,
    reasonContractSha256: locked.reasonContract.sha256,
    rowAdjudicationPath: locked.rowAdjudication.path,
    rowAdjudicationSha256: locked.rowAdjudication.sha256,
    necessityDecisionPath: locked.necessityDecision.path,
    necessityDecisionSha256: locked.necessityDecision.sha256,
    nature: "development_governance_evidence",
    derivation:
      "Append-only R4 derived from immutable R3 and sealed C37 development reason evidence; it is not a blind, independent, unseen, or holdout oracle.",
    independent: false,
    holdout: false,
    unseen: false,
    blind: false,
    rowCount: 3720,
    affectedRows: 145,
    unaffectedRows: 3575,
    rowsChangedFromR3: 145,
    rowsUnchangedFromR3: 3575,
    queriesChanged: 0,
    decisionsChanged: 0,
    relationsChanged: 0,
    sourceFieldsChanged: 0,
    categoryFieldsChanged: 0,
    metamorphicFieldsChanged: 0,
    rowOrderChanged: false,
    unauthorizedFieldDifferences: 0,
    runtimeExecuted: false,
    runtimeOutputUsed: true,
    runtimeOutputUseScope:
      "SEALED_C37_ACTUAL_REASON_EVIDENCE_ONLY; NO_LIVE_ANALYZER_OR_RUNTIME_EXECUTION",
    expectationsMutable: false,
    postCommitExpectationEditRule: "REVISIONS_REQUIRED",
    canonicalForNextStep: "C38_POST_R4_CLOSURE_RECONCILIATION",
    rows: r4Rows,
  };
  const r4Text = jsonText(r4);
  const r4Sha256 = sha256(r4Text);
  const r4Path = `${R4_DIR}/R20_DEVELOPMENT_ORACLE_FROZEN_R4.json`;

  const sourceLock = {
    task: "PHASE-10A14-R20",
    revision: "reason-family-r4",
    generatedUtc,
    inputs: Object.fromEntries(
      Object.entries(locked).map(([name, entry]) => [
        name,
        { path: entry.path, bytes: entry.bytes, sha256: entry.sha256 },
      ]),
    ),
    exactInputHashMatches: true,
    inputCount: Object.keys(locked).length,
  };

  const changeSet = {
    task: "PHASE-10A14-R20",
    revision: "reason-family-r4",
    generatedUtc,
    from: { path: locked.r3.path, sha256: locked.r3.sha256 },
    to: { path: r4Path, sha256: r4Sha256 },
    changedRows: 145,
    unchangedRows: 3575,
    onlyChangedField: "expectedReasonCodeFamily",
    changedOracleIds: changes.map((change) => change.oracleId),
    transitions: countBy(
      changes,
      (change) =>
        `${change.previousExpectedReasonCodeFamily} -> ${change.revisedExpectedReasonCodeFamily}`,
    ),
    changes,
  };

  const r4Adjudication = {
    task: "PHASE-10A14-R20",
    revision: "reason-family-r4",
    generatedUtc,
    classification: "SEALED_C37_REASON_EVIDENCE_APPEND_ONLY_ORACLE_GOVERNANCE",
    reasonContract: {
      path: locked.reasonContract.path,
      sha256: locked.reasonContract.sha256,
    },
    sourceAdjudication: {
      path: locked.rowAdjudication.path,
      sha256: locked.rowAdjudication.sha256,
    },
    nature: "development_governance_evidence",
    independent: false,
    holdout: false,
    unseen: false,
    blind: false,
    liveRuntimeExecuted: false,
    sealedC37ActualReasonEvidenceUsed: true,
    rowsAdjudicated: 145,
    rows: changes,
    pass: true,
  };

  const challenges = changes.map((change) => ({
    oracleId: change.oracleId,
    challenge:
      "R3 expectedReasonCodeFamily differs from the reason produced in sealed C37 development evidence under the accepted reason contract.",
    previousExpectedReasonCodeFamily: change.previousExpectedReasonCodeFamily,
    sealedC37ActualReason: change.revisedExpectedReasonCodeFamily,
    c37PrimaryCategory: change.c37PrimaryCategory,
    status: "RESOLVED_BY_APPEND_ONLY_R4_GOVERNANCE",
  }));
  const challengeRegister = {
    task: "PHASE-10A14-R20",
    revision: "reason-family-r4",
    generatedUtc,
    totalChallenges: challenges.length,
    unresolvedChallenges: 0,
    challenges,
  };

  const resolutions = changes.map((change) => ({
    oracleId: change.oracleId,
    resolution:
      "Replace only expectedReasonCodeFamily with the sealed C37 actual.reason; preserve every other R3 row value.",
    previousExpectedReasonCodeFamily: change.previousExpectedReasonCodeFamily,
    revisedExpectedReasonCodeFamily: change.revisedExpectedReasonCodeFamily,
    authority: "SEALED_C37_REASON_CONTRACT_AND_145_ROW_ADJUDICATION",
    runtimeCandidateAllocated: false,
  }));
  const resolutionRegister = {
    task: "PHASE-10A14-R20",
    revision: "reason-family-r4",
    generatedUtc,
    totalChallenges: challenges.length,
    resolved: resolutions.length,
    unresolved: 0,
    resolutions,
    pass: true,
  };

  const contaminationAudit = {
    task: "PHASE-10A14-R20",
    revision: "reason-family-r4",
    generatedUtc,
    analyzerImported: false,
    analyzerExecuted: false,
    productionBoundaryImported: false,
    productionBoundaryExecuted: false,
    liveRuntimeExecuted: false,
    liveRuntimeOutputUsed: false,
    sealedC37ActualReasonEvidenceUsed: true,
    runtimeOutputUsed: true,
    runtimeOutputUseScope:
      "SEALED_C37_ACTUAL_REASON_EVIDENCE_ONLY; NO_LIVE_ANALYZER_OR_RUNTIME EXECUTION",
    networkUsed: false,
    modelUsedByBuilder: false,
    independent: false,
    holdout: false,
    blind: false,
    pass: true,
  };

  const unchangedFieldProof = {
    task: "PHASE-10A14-R20",
    revision: "reason-family-r4",
    generatedUtc,
    rowCountEqual: r3.rows.length === r4Rows.length,
    rowOrderEqual: r3.rows.every((row, index) => row.oracleId === r4Rows[index].oracleId),
    oracleIdsEqual: true,
    queriesEqual: queryChanges === 0,
    expectedDecisionsEqual: decisionChanges === 0,
    expectedRelationsEqual: relationChanges === 0,
    sourceIdentityAndProvenanceEqual: sourceChanges === 0,
    categoriesEqual: categoryChanges === 0,
    metamorphicFieldsEqual: metamorphicChanges === 0,
    rowsCompared: 3720,
    targetedRows: 145,
    unchangedRows: 3575,
    unchangedRowsJsonValueEquivalent: 3575,
    rowsChanged: 145,
    onlyAuthorizedField: "expectedReasonCodeFamily",
    unauthorizedFieldDifferences,
    pass: true,
  };

  const distribution = {
    task: "PHASE-10A14-R20",
    revision: "reason-family-r4",
    generatedUtc,
    r3All: reasonDistribution(r3.rows),
    r4All: reasonDistribution(r4Rows),
    changedRowsBefore: reasonDistribution(
      changes.map((change) => ({
        expectedReasonCodeFamily: change.previousExpectedReasonCodeFamily,
      })),
    ),
    changedRowsAfter: reasonDistribution(
      changes.map((change) => ({
        expectedReasonCodeFamily: change.revisedExpectedReasonCodeFamily,
      })),
    ),
    transitionCounts: changeSet.transitions,
    totalRows: 3720,
    changedRows: 145,
  };

  const freeze = {
    task: "PHASE-10A14-R20",
    revision: "reason-family-r4",
    generatedUtc,
    v1Path: locked.v1.path,
    v1Sha256: locked.v1.sha256,
    r1Path: locked.r1.path,
    r1Sha256: locked.r1.sha256,
    r2Path: locked.r2.path,
    r2Sha256: locked.r2.sha256,
    r3Path: locked.r3.path,
    r3Sha256: locked.r3.sha256,
    r4Path,
    r4Sha256,
    reasonContractPath: locked.reasonContract.path,
    reasonContractSha256: locked.reasonContract.sha256,
    rowAdjudicationPath: locked.rowAdjudication.path,
    rowAdjudicationSha256: locked.rowAdjudication.sha256,
    necessityDecisionPath: locked.necessityDecision.path,
    necessityDecisionSha256: locked.necessityDecision.sha256,
    rowCount: 3720,
    affectedRows: 145,
    unaffectedRows: 3575,
    rowsChangedFromR3: 145,
    rowsUnchangedFromR3: 3575,
    queryChanges: 0,
    decisionChanges: 0,
    relationChanges: 0,
    sourceChanges: 0,
    categoryChanges: 0,
    metamorphicChanges: 0,
    rowOrderChanges: 0,
    unauthorizedFieldDifferences: 0,
    analyzerExecuted: false,
    liveRuntimeExecuted: false,
    sealedC37ActualReasonEvidenceUsed: true,
    runtimeOutputUsed: true,
    runtimeOutputUseScope:
      "SEALED_C37_ACTUAL_REASON_EVIDENCE_ONLY; NO_LIVE_ANALYZER_OR_RUNTIME_EXECUTION",
    nature: "development_governance_evidence",
    independent: false,
    holdout: false,
    unseen: false,
    blind: false,
    expectationsMutable: false,
    postCommitExpectationEditRule: "REVISIONS_REQUIRED",
    canonicalForNextStep: "C38_POST_R4_CLOSURE_RECONCILIATION",
    currentStateUpdated: false,
    pass: true,
  };

  const index = {
    canonicalEntryPoint: "R20_DEVELOPMENT_ORACLE_FROZEN_R4.json",
    r4Sha256,
    r3Sha256: locked.r3.sha256,
    r2Sha256: locked.r2.sha256,
    r1Sha256: locked.r1.sha256,
    v1Sha256: locked.v1.sha256,
    rowCount: 3720,
    changedRowsFromR3: 145,
    nature: "development_governance_evidence",
    independent: false,
    holdout: false,
    blind: false,
  };

  const supersession = {
    task: "PHASE-10A14-R20",
    revision: "reason-family-r4",
    generatedUtc,
    statement: [
      "V1, R1, R2, and R3 remain immutable historical development evidence.",
      "R4 supersedes R3 only as the canonical development oracle for C38 post-R4 closure reconciliation.",
      "R4 changes only expectedReasonCodeFamily on the exact 145 identities sealed by C37 adjudication.",
      "Every R4 revised reason equals the corresponding sealed C37 actual.reason value.",
      "R4 changes no query, decision, expected relation, source identity/provenance, category, metamorphic field, row order, or non-target row value.",
      "No runtime candidate is allocated and no live analyzer or runtime is imported or executed.",
      "R4 uses sealed C37 actual reason evidence and is development governance evidence, not unseen, blind, independent, or holdout evidence.",
    ],
    v1Sha256: locked.v1.sha256,
    r1Sha256: locked.r1.sha256,
    r2Sha256: locked.r2.sha256,
    r3Sha256: locked.r3.sha256,
    r4Sha256,
    reasonContractPath: locked.reasonContract.path,
    reasonContractSha256: locked.reasonContract.sha256,
    rowAdjudicationPath: locked.rowAdjudication.path,
    rowAdjudicationSha256: locked.rowAdjudication.sha256,
    necessityDecisionPath: locked.necessityDecision.path,
    necessityDecisionSha256: locked.necessityDecision.sha256,
  };

  const byName = new Map([
    ["R20_DEVELOPMENT_ORACLE_FROZEN_R4.json", r4Text],
    ["R20_DEVELOPMENT_ORACLE_R4_FREEZE.json", jsonText(freeze)],
    ["R20_DEVELOPMENT_ORACLE_R4_INDEX.json", jsonText(index)],
    ["R20_DEVELOPMENT_ORACLE_R4_SUPERSESSION_RECORD.json", jsonText(supersession)],
    ["R20_REASON_FAMILY_R4_SOURCE_LOCK.json", jsonText(sourceLock)],
    ["R20_REASON_FAMILY_R4_CHANGESET.json", jsonText(changeSet)],
    ["R20_REASON_FAMILY_R4_ADJUDICATION.json", jsonText(r4Adjudication)],
    ["R20_REASON_FAMILY_R4_CHALLENGE_REGISTER.json", jsonText(challengeRegister)],
    ["R20_REASON_FAMILY_R4_RESOLUTION_REGISTER.json", jsonText(resolutionRegister)],
    ["R20_REASON_FAMILY_R4_ANALYZER_CONTAMINATION_AUDIT.json", jsonText(contaminationAudit)],
    ["R20_REASON_FAMILY_R4_UNCHANGED_FIELD_PROOF.json", jsonText(unchangedFieldProof)],
    ["R20_REASON_FAMILY_R4_REASON_DISTRIBUTION.json", jsonText(distribution)],
  ]);
  assert(byName.size === 12, "exactly 12 R4 artifacts are required");
  assert(R4_FILES.every((fileName) => byName.has(fileName)), "R4 artifact name set mismatch");

  const outputManifest = Object.fromEntries(
    R4_FILES.map((fileName) => {
      const text = byName.get(fileName);
      return [
        fileName,
        {
          path: `${R4_DIR}/${fileName}`,
          bytes: Buffer.byteLength(text),
          sha256: sha256(text),
        },
      ];
    }),
  );

  const result = {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C38",
    classification: "C38_APPEND_ONLY_R4_ORACLE_REVISION_COMPLETE",
    generatedUtc,
    controllingBranch: EXPECTED_BRANCH,
    controllingHead: EXPECTED_HEAD,
    decision: "C38_EXECUTABLE_ZERO_RUNTIME_CANDIDATE_WITH_APPEND_ONLY_R4_ORACLE_GOVERNANCE",
    candidateBudgetMaximum: 3,
    candidatesAuthorized: 0,
    candidatesAllocated: 0,
    runtimeChanged: false,
    oracleChanged: true,
    inputLocks: sourceLock.inputs,
    outputs: outputManifest,
    proofs: {
      r3ByteSha256Before: locked.r3.sha256,
      r3ByteSha256After: locked.r3.sha256,
      r3ByteUnchanged: true,
      r4RowCount: 3720,
      exactChangedRowCount: 145,
      exactUnchangedRowCount: 3575,
      onlyExpectedReasonCodeFamilyChanged: true,
      everyNewReasonEqualsSealedC37ActualReason: true,
      queryChanges: 0,
      decisionChanges: 0,
      relationChanges: 0,
      sourceChanges: 0,
      categoryChanges: 0,
      metamorphicChanges: 0,
      rowOrderChanges: 0,
      unauthorizedFieldDifferences: 0,
      liveAnalyzerImported: false,
      liveAnalyzerExecuted: false,
      liveRuntimeExecuted: false,
      sealedC37ActualReasonEvidenceUsed: true,
    },
    evidenceNature: {
      developmentGovernanceEvidence: true,
      independent: false,
      holdout: false,
      unseen: false,
      blind: false,
    },
    canonicalForNextStep: "C38_POST_R4_CLOSURE_RECONCILIATION",
    pass: true,
  };

  return { byName, resultText: jsonText(result), outputManifest };
}

function writeAndVerify({ byName, resultText, outputManifest }, locked) {
  writesStarted = true;
  fs.mkdirSync(abs(R4_DIR), { recursive: false });
  for (const fileName of R4_FILES) {
    fs.writeFileSync(abs(`${R4_DIR}/${fileName}`), byName.get(fileName), {
      encoding: "utf8",
      flag: "wx",
    });
  }
  fs.writeFileSync(abs(RESULT_PATH), resultText, { encoding: "utf8", flag: "wx" });

  const actualNames = fs
    .readdirSync(abs(R4_DIR), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  assert(deepEqual(actualNames, [...R4_FILES].sort()), "R4 directory does not contain exactly 12 artifacts");

  for (const fileName of R4_FILES) {
    const bytes = fs.readFileSync(abs(`${R4_DIR}/${fileName}`));
    const expected = outputManifest[fileName];
    assert(bytes.length === expected.bytes, `output byte count mismatch: ${fileName}`);
    assert(sha256(bytes) === expected.sha256, `output hash mismatch: ${fileName}`);
    JSON.parse(bytes.toString("utf8"));
  }
  JSON.parse(fs.readFileSync(abs(RESULT_PATH), "utf8"));
  assert(
    sha256(fs.readFileSync(abs(locked.r3.path))) === locked.r3.sha256,
    "R3 changed during the R4 build",
  );
}

function main() {
  assert(process.argv.length === 3 && process.argv[2] === "--build-r4", "usage: node commit5r1c38-oracle-governance.mjs --build-r4");
  assertPreWriteState();
  const locked = readLockedInputs();
  const artifacts = buildArtifacts(locked);
  writeAndVerify(artifacts, locked);
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "PASS",
        classification: "C38_APPEND_ONLY_R4_ORACLE_REVISION_COMPLETE",
        r4Artifacts: R4_FILES.length,
        resultPath: RESULT_PATH,
        changedRows: 145,
        unchangedRows: 3575,
        runtimeCandidatesAllocated: 0,
      },
      null,
      2,
    )}\n`,
  );
}

try {
  main();
} catch (error) {
  const prefix = writesStarted ? "TECHNICAL_FAILURE_AFTER_WRITE" : "SAFE_PAUSE_BEFORE_WRITE";
  process.stderr.write(`${prefix}: ${error.message}\n`);
  process.exitCode = 1;
}
