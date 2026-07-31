import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { REPO, RESULTS, hashRecord, readJson } from "./commit5r1c35-lib.mjs";

const expectedHead = "d5b25e676f623fbc1888608ff250824fcd34af99";
const expectedC34Runtime = "73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775";
const expectedCandidateRuntime = "a37f41c01b3be16fb992f206f93dca67c8a5cbc79930997b416feaa5c7851e7d";
const expectedC34Wal = "2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2";
const expectedC34Checkpoint = "a2c58b82d05719738bbe6e5b8145a6a5b6a84b6357fe30f5fe51625cd9cfa75a";
const expectedC34CheckpointLog = "091656f6c5cb188417bdce1bc799bd5328d4450365d3f51e5655a851239e7b2d";
const previousEventSha256 = "3d431970d558a6d6e31f1bb307bd966b467cba67159db5ccda9c01a1a84eb9eb";
const candidateId = "C35-TC01-SAME-AUTHORITY-RECORD-FRAGMENTS-ARE-NOT-TWO-POSITIONS";
const attemptId = "R20-trust_calibration-commit5r1c35-tc01-ord01-2026-07-31T04-00-20-140Z";

const pointerPath = path.join(RESULTS, "COMMIT_5R1C35_RECOVERY_CHECKPOINT.json");
const archivePath = path.join(
  RESULTS,
  "COMMIT_5R1C35_RECOVERY_CHECKPOINT_61_two_hour_vat_authority_conflict_calibration_safe_pause.json"
);
const logPath = path.join(RESULTS, "COMMIT_5R1C35_RECOVERY_CHECKPOINT_LOG.ndjson");
const manifestPath = path.join(RESULTS, "COMMIT_5R1C35_FINAL_EVIDENCE.sha256");
const registryPath = path.join(RESULTS, "CANONICAL_ATTEMPT_REGISTRY.json");
const c34WalPath = path.join(RESULTS, "COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson");
const c35WalPath = path.join(RESULTS, "COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(file) {
  return sha256(fs.readFileSync(file));
}

function git(args) {
  return execFileSync("git", args, {
    cwd: REPO,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  }).trim();
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeOnce(file, bytes) {
  const content = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file);
    if (!existing.equals(content)) {
      throw new Error(`C35_SAFE_PAUSE_WRITE_ONCE_MISMATCH:${path.basename(file)}`);
    }
    return false;
  }
  fs.writeFileSync(file, content, { flag: "wx" });
  return true;
}

function assertIdentity(file, expected, label) {
  const actual = sha256File(file);
  if (actual !== expected) throw new Error(`${label}_IDENTITY_MISMATCH:${actual}`);
}

function artifact(pathname) {
  return hashRecord(pathname);
}

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(full) : [full];
  });
}

function manifestFiles() {
  const files = [
    path.join(REPO, "conflict-engine.js"),
    path.join(
      REPO,
      "tests",
      "phase-10a14-r20-commit5r1c35-vat-authority-conflict-calibration.test.mjs"
    ),
    registryPath,
    c35WalPath
  ];
  const fixtureRoot = path.join(REPO, "evaluation", "fixtures", "phase-10a14-r20");
  files.push(
    ...collectFiles(fixtureRoot).filter((file) =>
      path.basename(file).startsWith("commit5r1c35-")
    )
  );
  const runnerRoot = path.join(REPO, "evaluation", "runner", "phase-10a14-r20");
  files.push(
    ...collectFiles(runnerRoot).filter((file) =>
      path.basename(file).startsWith("commit5r1c35-")
    )
  );
  files.push(
    ...fs.readdirSync(RESULTS, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.startsWith("COMMIT_5R1C35"))
      .map((entry) => path.join(RESULTS, entry.name))
  );
  files.push(
    ...collectFiles(path.join(RESULTS, "attempts", attemptId))
  );
  return [...new Set(files.map((file) => path.resolve(file)))]
    .filter((file) => file !== path.resolve(manifestPath))
    .filter((file) => !file.endsWith(".tmp"))
    .sort();
}

function manifestBytes() {
  const lines = manifestFiles().map((file) => {
    const relative = path.relative(REPO, file).replaceAll("\\", "/");
    return `${sha256File(file)}  ${relative}`;
  });
  return Buffer.from(`${lines.join("\n")}\n`);
}

function validateTerminalState() {
  if (git(["rev-parse", "HEAD"]) !== expectedHead) throw new Error("HEAD_MISMATCH");
  if (
    git(["rev-parse", "origin/feature/source-availability-engine-v1"]) !==
    expectedHead
  ) {
    throw new Error("UPSTREAM_MISMATCH");
  }
  if (git(["diff", "--cached", "--name-only"])) throw new Error("STAGING_NOT_EMPTY");
  if (fs.existsSync(path.join(REPO, ".git", "index.lock"))) {
    throw new Error("GIT_INDEX_LOCK_PRESENT");
  }
  if (fs.existsSync(path.join(RESULTS, ".commit5r1c35-allocation.lock"))) {
    throw new Error("C35_ALLOCATION_LOCK_PRESENT");
  }
  const c35Temps = fs.readdirSync(RESULTS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(".c35-"));
  if (c35Temps.length) throw new Error("C35_TEMP_DIRECTORY_PRESENT");

  assertIdentity(c34WalPath, expectedC34Wal, "C34_WAL");
  assertIdentity(
    path.join(RESULTS, "COMMIT_5R1C34_RECOVERY_CHECKPOINT.json"),
    expectedC34Checkpoint,
    "C34_CHECKPOINT"
  );
  assertIdentity(
    path.join(RESULTS, "COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson"),
    expectedC34CheckpointLog,
    "C34_CHECKPOINT_LOG"
  );
  assertIdentity(
    path.join(REPO, "conflict-engine.js"),
    expectedCandidateRuntime,
    "C35_CANDIDATE_RUNTIME"
  );

  const registry = readJson(registryPath);
  const attempts = registry.attempts;
  const row = attempts.find((entry) => entry.attemptId === attemptId);
  if (
    attempts.length !== 229 ||
    !row ||
    row.candidateId !== candidateId ||
    row.status !== "completed" ||
    row.disposition !== "ACCEPTED_PROMOTED_CONTROLLING" ||
    row.controlling !== true ||
    registry.c35?.activeAttemptId != null ||
    attempts.some((entry) => entry.status === "running")
  ) {
    throw new Error("C35_REGISTRY_NOT_TERMINAL");
  }
  const dirs = fs.readdirSync(path.join(RESULTS, "attempts"), {
    withFileTypes: true
  }).filter((entry) => entry.isDirectory());
  const registryIds = new Set(attempts.map((entry) => entry.attemptId));
  const directoryIds = new Set(dirs.map((entry) => entry.name));
  const orphan = [...directoryIds].filter((id) => !registryIds.has(id));
  const dangling = [...registryIds].filter((id) => !directoryIds.has(id));
  if (dirs.length !== 229 || orphan.length || dangling.length) {
    throw new Error("C35_REGISTRY_DIRECTORY_RECONCILIATION_FAILED");
  }
  const walRows = fs.readFileSync(c35WalPath, "utf8").trim().split(/\r?\n/);
  if (walRows.length !== 3) throw new Error("C35_WAL_ROW_COUNT_MISMATCH");
  const walEvents = walRows.map((line) => JSON.parse(line));
  if (
    walEvents.filter((event) => event.event === "ALLOCATION_PLANNED").length !== 1 ||
    walEvents.filter((event) => event.event === "ALLOCATION_REGISTERED").length !== 1 ||
    walEvents.filter((event) => event.event === "ATTEMPT_TERMINAL").length !== 1
  ) {
    throw new Error("C35_WAL_LIFECYCLE_MISMATCH");
  }
  const inspection = readJson(
    path.join(RESULTS, "COMMIT_5R1C35_TERMINAL_RUNTIME_INSPECTION.json")
  );
  if (
    inspection.pass !== true ||
    inspection.processInspection?.pass !== true ||
    inspection.temporaryRuntimeInspection?.activeTemporaryRuntimeCount !== 0 ||
    inspection.locks?.pass !== true ||
    inspection.git?.stagingEmpty !== true ||
    inspection.serviceIdentity?.known !== true
  ) {
    throw new Error("C35_TERMINAL_RUNTIME_INSPECTION_FAILED");
  }
  const result = readJson(
    path.join(RESULTS, "COMMIT_5R1C35_CANDIDATE_1_RESULT.json")
  );
  if (
    result.verdict !== "ACCEPTED_PROMOTED_CONTROLLING" ||
    result.pass !== true ||
    result.candidateRuntimeHash !== expectedCandidateRuntime
  ) {
    throw new Error("C35_CANDIDATE_RESULT_INVALID");
  }
  return {
    registry,
    registryAttempts: attempts.length,
    attemptDirectories: dirs.length,
    c35WalRows: walRows.length,
    orphan: orphan.length,
    dangling: dangling.length
  };
}

function createCheckpoint(state) {
  const updatedAtUtc = new Date().toISOString();
  const evidencePaths = fs.readdirSync(RESULTS, { withFileTypes: true })
    .filter((entry) =>
      entry.isFile() &&
      entry.name.startsWith("COMMIT_5R1C35") &&
      !entry.name.includes("RECOVERY_CHECKPOINT") &&
      entry.name !== path.basename(manifestPath)
    )
    .map((entry) => path.join(RESULTS, entry.name))
    .sort();
  evidencePaths.push(registryPath, c35WalPath);
  const artifactHashes = [...new Set(evidencePaths)].map(artifact);
  const core = {
    schemaVersion: 2,
    ordinal: 61,
    commitUnit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    updatedAtUtc,
    stage: "two-hour VAT authority-conflict calibration terminal safe pause",
    status: "C35_TWO_HOUR_SAFE_PAUSE_AFTER_CANDIDATE_1_ACCEPTED",
    head: expectedHead,
    upstream: expectedHead,
    activeBaseHash: expectedCandidateRuntime,
    selectedC34RuntimeHash: expectedC34Runtime,
    candidateId,
    attemptId,
    activeAttemptId: null,
    candidateDisposition: "ACCEPTED_PROMOTED_CONTROLLING",
    independentReview: "PENDING_INDEPENDENT_REVIEW",
    liveDeploymentChanged: false,
    localServiceRunning: false,
    registryAttempts: state.registryAttempts,
    attemptDirectories: state.attemptDirectories,
    c35WalRows: state.c35WalRows,
    orphan: state.orphan,
    dangling: state.dangling,
    artifactHashes,
    previousCheckpointOrdinal: 60,
    previousCheckpointEventSha256: previousEventSha256,
    previousCheckpointLogSha256: expectedC34CheckpointLog,
    nextExactOperation:
      "Under a separately governed C35 finalization prompt, obtain one read-only independent Opus review of the root cause, fixtures, candidate diff, conflict preservation, authority-support independence, C34 preservation, and replay evidence. Do not stage, commit, push, deploy, allocate Candidate 2, begin C36, or begin Phase 10B.",
    safeToResume: true,
    blocker: null
  };
  return { ...core, eventSha256: sha256(JSON.stringify(core)) };
}

const state = validateTerminalState();
let checkpoint;
let checkpointCreated = false;
if ([pointerPath, archivePath, logPath].some((file) => fs.existsSync(file))) {
  if (![pointerPath, archivePath, logPath].every((file) => fs.existsSync(file))) {
    throw new Error("C35_PARTIAL_CHECKPOINT_PRESENT");
  }
  checkpoint = readJson(pointerPath);
  if (
    stableJson(checkpoint) !== fs.readFileSync(archivePath, "utf8") ||
    fs.readFileSync(logPath, "utf8") !== `${JSON.stringify(checkpoint)}\n` ||
    checkpoint.ordinal !== 61 ||
    checkpoint.safeToResume !== true ||
    checkpoint.activeAttemptId != null ||
    checkpoint.status !==
      "C35_TWO_HOUR_SAFE_PAUSE_AFTER_CANDIDATE_1_ACCEPTED"
  ) {
    throw new Error("C35_CHECKPOINT_IDEMPOTENCE_VALIDATION_FAILED");
  }
} else {
  checkpoint = createCheckpoint(state);
  const pretty = stableJson(checkpoint);
  checkpointCreated = writeOnce(pointerPath, pretty);
  writeOnce(archivePath, pretty);
  writeOnce(logPath, `${JSON.stringify(checkpoint)}\n`);
}

const manifest = manifestBytes();
const manifestCreated = writeOnce(manifestPath, manifest);
const manifestEntries = manifest.toString("utf8").trim().split(/\r?\n/).length;

console.log(JSON.stringify({
  operation: "safe-pause",
  idempotent: !checkpointCreated && !manifestCreated,
  checkpointCreated,
  manifestCreated,
  ordinal: checkpoint.ordinal,
  status: checkpoint.status,
  safeToResume: checkpoint.safeToResume,
  activeAttemptId: checkpoint.activeAttemptId,
  activeBaseHash: checkpoint.activeBaseHash,
  checkpointEventSha256: checkpoint.eventSha256,
  pointer: hashRecord(pointerPath),
  archive: hashRecord(archivePath),
  log: hashRecord(logPath),
  manifest: hashRecord(manifestPath),
  manifestEntries,
  registryAttempts: state.registryAttempts,
  c35WalRows: state.c35WalRows,
  orphan: state.orphan,
  dangling: state.dangling,
  stagingEmpty: true,
  pass: true
}, null, 2));
