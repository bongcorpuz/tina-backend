import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..", "..");
const resultRoot = path.join(repo, "evaluation", "results", "phase-10a14-r20");
const registryPath = path.join(resultRoot, "CANONICAL_ATTEMPT_REGISTRY.json");
const c34WalPath = path.join(resultRoot, "COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson");
const c35WalPath = path.join(resultRoot, "COMMIT_5R1C35_ATTEMPT_ALLOCATION_WAL.ndjson");
const lockPath = path.join(resultRoot, ".commit5r1c35-allocation.lock");

const candidateId = "C35-TC01-SAME-AUTHORITY-RECORD-FRAGMENTS-ARE-NOT-TWO-POSITIONS";
const attemptId = "R20-trust_calibration-commit5r1c35-tc01-ord01-2026-07-31T04-00-20-140Z";
const attemptDir = path.join(resultRoot, "attempts", attemptId);
const attemptPath = path.join(attemptDir, "ATTEMPT.json");
const authorizationPath = path.join(resultRoot, "COMMIT_5R1C35_CANDIDATE_1_AUTHORIZATION.json");

const expected = Object.freeze({
  head: "d5b25e676f623fbc1888608ff250824fcd34af99",
  c34Runtime: "73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775",
  registryBefore: "b42e030f49c3e30959ad6043d2897af55029d268aaeea17cc37bfbe93c383e43",
  c34Wal: "2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2",
  authorization: null
});

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(file) {
  return sha256Buffer(fs.readFileSync(file));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function atomicWrite(file, contents) {
  const resolved = path.resolve(file);
  if (!resolved.startsWith(`${path.resolve(resultRoot)}${path.sep}`)) {
    throw new Error(`Refusing write outside result root: ${resolved}`);
  }
  const temp = `${resolved}.c35-${process.pid}.tmp`;
  fs.writeFileSync(temp, contents, { encoding: "utf8", flag: "wx" });
  fs.renameSync(temp, resolved);
}

function appendWal(event) {
  fs.appendFileSync(c35WalPath, `${JSON.stringify(event)}\n`, "utf8");
}

function withAllocationLock(action) {
  let handle;
  try {
    handle = fs.openSync(lockPath, "wx");
    fs.writeFileSync(handle, `${process.pid}\n`, "utf8");
    return action();
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  }
}

function ensureCommonIdentity() {
  if (sha256File(c34WalPath) !== expected.c34Wal) {
    throw new Error("C34 WAL identity changed; refusing C35 mutation");
  }
  const auth = readJson(authorizationPath);
  if (auth.verdict !== "PASS_READY_FOR_C35_CANDIDATE_1" || auth.pass !== true) {
    throw new Error("Candidate authorization is not valid");
  }
  if (auth.candidateId !== candidateId || auth.attemptId !== attemptId) {
    throw new Error("Candidate authorization identity mismatch");
  }
}

function buildAttempt(startedAt) {
  const commandArgs = [
    "evaluation/runner/phase-10a14-r20/commit5r1c35-candidate.mjs",
    "allocate"
  ];
  return {
    attemptId,
    attemptCategory: "trust_calibration",
    gateName: "commit5r1c35",
    cycle: "tc01",
    attemptOrdinal: 1,
    candidateId,
    retryOf: null,
    retryReason: null,
    retryType: null,
    evidenceHeadAtAllocation: expected.head,
    evidenceHeadAtStart: expected.head,
    evidenceHeadAtEnd: null,
    runtimeBaselineCommit: expected.head,
    runtimeTreeDigest: expected.c34Runtime,
    semanticBase: {
      commit: expected.head,
      selectedC34Runtime: expected.c34Runtime
    },
    executionMode: "bounded_worktree_candidate_no_service",
    command: process.execPath,
    commandArgs,
    commandHash: sha256Buffer(commandArgs.join("\u0000")),
    startedAt,
    endedAt: null,
    exitCode: null,
    signal: null,
    status: "running",
    disposition: "ACTIVE_CANDIDATE_1",
    controlling: false,
    stdoutPath: null,
    stderrPath: null,
    resultPaths: [],
    oracleVersion: "C35-VAT-CONFLICT-CALIBRATION-V1",
    oracleSha256: "56649a2cfaf6bc3159b2d5b18900f634278a1c8d10069ed86f5be4d828088cee"
  };
}

function allocate() {
  return withAllocationLock(() => {
    ensureCommonIdentity();
    if (fs.existsSync(c35WalPath) || fs.existsSync(attemptDir)) {
      throw new Error("C35 allocation target already exists");
    }
    if (sha256File(registryPath) !== expected.registryBefore) {
      throw new Error("Canonical registry identity changed before allocation");
    }

    const registry = readJson(registryPath);
    if (!Array.isArray(registry.attempts) || registry.attempts.length !== 228) {
      throw new Error("Canonical registry count is not the authorized 228");
    }
    if (registry.attempts.some((row) => row.attemptId === attemptId || row.candidateId === candidateId)) {
      throw new Error("Duplicate C35 attempt or candidate");
    }

    const startedAt = "2026-07-31T04:00:20.140Z";
    const attempt = buildAttempt(startedAt);
    fs.mkdirSync(attemptDir, { recursive: false });
    atomicWrite(attemptPath, stableJson(attempt));

    appendWal({
      event: "ALLOCATION_PLANNED",
      at: startedAt,
      attemptId,
      candidateId,
      runtimeDirectory: null,
      semanticBase: attempt.semanticBase,
      retryOf: null,
      retryReason: null,
      retryType: null
    });

    registry.attempts.push(attempt);
    registry.generatedAt = startedAt;
    registry.cumulativeThrough = "commit5r1c35-candidate1-active";
    registry.summary.totalAttempts = registry.attempts.length;
    registry.summary.total = registry.attempts.length;
    registry.summary.byCategory.trust_calibration =
      Number(registry.summary.byCategory.trust_calibration || 0) + 1;
    registry.summary.nonControlling = Number(registry.summary.nonControlling || 0) + 1;
    registry.summary.c35RunningAttemptIds = [attemptId];
    registry.summary.c35OrphanAttemptIds = [];
    registry.summary.c35DanglingAttemptIds = [];
    registry.c35 = {
      candidateLimit: 1,
      allocatedCandidateIds: [candidateId],
      activeAttemptId: attemptId,
      provisionalSelection: null
    };
    atomicWrite(registryPath, stableJson(registry));

    appendWal({
      event: "ALLOCATION_REGISTERED",
      at: "2026-07-31T04:00:20.141Z",
      attemptId,
      candidateId
    });

    return {
      operation: "allocate",
      attemptId,
      candidateId,
      registryAttempts: registry.attempts.length,
      registrySha256: sha256File(registryPath),
      c35WalRows: fs.readFileSync(c35WalPath, "utf8").trim().split(/\r?\n/).length,
      c35WalSha256: sha256File(c35WalPath),
      c34WalSha256: sha256File(c34WalPath),
      activeAttemptId: attemptId,
      pass: true
    };
  });
}

function terminalize() {
  return withAllocationLock(() => {
    ensureCommonIdentity();
    if (!fs.existsSync(c35WalPath) || !fs.existsSync(attemptPath)) {
      throw new Error("C35 attempt is not allocated");
    }
    const walLines = fs.readFileSync(c35WalPath, "utf8").trim().split(/\r?\n/);
    if (walLines.length === 3) {
      const existing = readJson(attemptPath);
      if (existing.status !== "completed") throw new Error("Three-row WAL has non-terminal attempt");
      return {
        operation: "terminalize",
        idempotent: true,
        attemptId,
        disposition: existing.disposition,
        pass: true
      };
    }
    if (walLines.length !== 2) throw new Error(`Unexpected C35 WAL row count: ${walLines.length}`);

    const resultPath = path.join(resultRoot, "COMMIT_5R1C35_CANDIDATE_1_RESULT.json");
    const replayPath = path.join(resultRoot, "COMMIT_5R1C35_CANDIDATE_1_REPLAY.json");
    const preservationPath = path.join(resultRoot, "COMMIT_5R1C35_C34_FROZEN_PRESERVATION.json");
    for (const required of [resultPath, replayPath, preservationPath]) {
      if (!fs.existsSync(required)) throw new Error(`Missing required terminal evidence: ${required}`);
    }
    const result = readJson(resultPath);
    if (result.verdict !== "ACCEPTED_PROMOTED_CONTROLLING" || result.pass !== true) {
      throw new Error("Candidate result does not authorize accepted terminalization");
    }

    const registry = readJson(registryPath);
    const index = registry.attempts.findIndex((row) => row.attemptId === attemptId);
    if (index < 0) throw new Error("Allocated attempt is missing from registry");
    const attempt = registry.attempts[index];
    if (attempt.status !== "running") throw new Error(`Unexpected attempt status: ${attempt.status}`);

    const endedAt = result.generatedUtc;
    const resultPaths = [
      path.relative(repo, resultPath).replaceAll("\\", "/"),
      path.relative(repo, replayPath).replaceAll("\\", "/"),
      path.relative(repo, preservationPath).replaceAll("\\", "/")
    ];
    Object.assign(attempt, {
      evidenceHeadAtEnd: expected.head,
      candidateRuntimeHash: result.candidateRuntimeHash,
      endedAt,
      exitCode: 0,
      status: "completed",
      disposition: "ACCEPTED_PROMOTED_CONTROLLING",
      controlling: true,
      resultPaths
    });
    registry.attempts[index] = attempt;
    registry.generatedAt = endedAt;
    registry.cumulativeThrough = "commit5r1c35-candidate1-provisional-selection";
    registry.summary.controlling = Number(registry.summary.controlling || 0) + 1;
    registry.summary.nonControlling = Math.max(0, Number(registry.summary.nonControlling || 0) - 1);
    registry.summary.c35RunningAttemptIds = [];
    registry.c35.activeAttemptId = null;
    registry.c35.provisionalSelection = {
      attemptId,
      candidateId,
      disposition: "ACCEPTED_PROMOTED_CONTROLLING",
      candidateRuntimeHash: result.candidateRuntimeHash,
      independentReview: "PENDING_INDEPENDENT_REVIEW"
    };
    atomicWrite(registryPath, stableJson(registry));
    atomicWrite(attemptPath, stableJson(attempt));
    appendWal({
      event: "ATTEMPT_TERMINAL",
      at: endedAt,
      attemptId,
      candidateId,
      status: "completed",
      disposition: "ACCEPTED_PROMOTED_CONTROLLING"
    });

    return {
      operation: "terminalize",
      idempotent: false,
      attemptId,
      candidateId,
      disposition: attempt.disposition,
      registryAttempts: registry.attempts.length,
      registrySha256: sha256File(registryPath),
      c35WalRows: 3,
      c35WalSha256: sha256File(c35WalPath),
      c34WalSha256: sha256File(c34WalPath),
      activeAttemptId: null,
      pass: true
    };
  });
}

const operation = process.argv[2];
if (operation === "allocate") {
  console.log(JSON.stringify(allocate(), null, 2));
} else if (operation === "terminalize") {
  console.log(JSON.stringify(terminalize(), null, 2));
} else {
  throw new Error("Usage: node commit5r1c35-candidate.mjs allocate|terminalize");
}
