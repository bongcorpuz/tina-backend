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

const candidateId = "C35-SU01-MATERIAL-PROPOSITION-SUPPORT-MUST-BIND-FINAL-RENDERED-CLAIM";
const attemptId = "R20-trust_calibration-commit5r1c35-su01-ord02-2026-07-31T05-07-02-643Z";
const candidate1Id = "C35-TC01-SAME-AUTHORITY-RECORD-FRAGMENTS-ARE-NOT-TWO-POSITIONS";
const candidate1AttemptId = "R20-trust_calibration-commit5r1c35-tc01-ord01-2026-07-31T04-00-20-140Z";
const attemptDir = path.join(resultRoot, "attempts", attemptId);
const attemptPath = path.join(attemptDir, "ATTEMPT.json");
const authorizationPath = path.join(resultRoot, "COMMIT_5R1C35_CANDIDATE_2_AUTHORIZATION.json");

const expected = Object.freeze({
  head: "d5b25e676f623fbc1888608ff250824fcd34af99",
  c34Runtime: "73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775",
  candidate1Runtime: "a37f41c01b3be16fb992f206f93dca67c8a5cbc79930997b416feaa5c7851e7d",
  registryBefore: "08d714949661501f4ef762c54eb40e5a67619359a791193b6e18cdc2d4e2156a",
  c35WalBefore: "493dff0caedd11420ae4ea3a61fe26e5b6cd52879ef8673a065d588a953b6761",
  c34Wal: "2dfbc7ad99467ceb7b1eb9b264fa70ed8408767f574b8cdca6636ed4f98b60b2"
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
  const allowedRoot = `${path.resolve(resultRoot)}${path.sep}`;
  if (!resolved.startsWith(allowedRoot)) {
    throw new Error(`Refusing write outside result root: ${resolved}`);
  }
  const temp = `${resolved}.c35-${process.pid}.tmp`;
  fs.writeFileSync(temp, contents, { encoding: "utf8", flag: "wx" });
  fs.renameSync(temp, resolved);
}

function appendWal(event) {
  fs.appendFileSync(c35WalPath, `${JSON.stringify(event)}\n`, "utf8");
}

function walRows() {
  return fs.readFileSync(c35WalPath, "utf8").trim().split(/\r?\n/);
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
  if (sha256File(path.join(repo, "conflict-engine.js")) !== expected.candidate1Runtime) {
    throw new Error("Candidate 1 active base changed; refusing Candidate 2");
  }
  const auth = readJson(authorizationPath);
  if (auth.verdict !== "PASS_READY_FOR_C35_CANDIDATE_2" || auth.pass !== true) {
    throw new Error("Candidate 2 authorization is not valid");
  }
  if (auth.candidateId !== candidateId || auth.attemptId !== attemptId) {
    throw new Error("Candidate 2 authorization identity mismatch");
  }
  if (auth.candidate3Authorized !== false || auth.maximumAdditionalCandidates !== 1) {
    throw new Error("Candidate limit mismatch");
  }
}

function buildAttempt(startedAt) {
  const commandArgs = [
    "evaluation/runner/phase-10a14-r20/commit5r1c35-candidate2.mjs",
    "allocate"
  ];
  return {
    attemptId,
    attemptCategory: "trust_calibration",
    gateName: "commit5r1c35",
    cycle: "su01",
    attemptOrdinal: 2,
    candidateId,
    retryOf: null,
    retryReason: null,
    retryType: null,
    evidenceHeadAtAllocation: expected.head,
    evidenceHeadAtStart: expected.head,
    evidenceHeadAtEnd: null,
    runtimeBaselineCommit: expected.head,
    runtimeTreeDigest: expected.candidate1Runtime,
    semanticBase: {
      commit: expected.head,
      selectedC34Runtime: expected.c34Runtime,
      candidate1ActiveBase: expected.candidate1Runtime,
      candidate1AttemptId
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
    disposition: "ACTIVE_CANDIDATE_2",
    controlling: false,
    stdoutPath: null,
    stderrPath: null,
    resultPaths: [],
    oracleVersion: "C35-ANSWER-SUPPORT-PASSAGE-BINDING-V1",
    oracleSha256: "66d7b5e884c5779b4d034fc64db16a72ebb9fb5b4cdf6f6acd2afb09e1cca244"
  };
}

function validateCandidate1(registry) {
  const candidate1 = registry.attempts.find((row) => row.attemptId === candidate1AttemptId);
  if (
    !candidate1 ||
    candidate1.candidateId !== candidate1Id ||
    candidate1.status !== "completed" ||
    candidate1.disposition !== "ACCEPTED_PROMOTED_CONTROLLING" ||
    candidate1.controlling !== true ||
    candidate1.candidateRuntimeHash !== expected.candidate1Runtime
  ) {
    throw new Error("Candidate 1 terminal identity mismatch");
  }
}

function allocate() {
  return withAllocationLock(() => {
    ensureCommonIdentity();
    if (fs.existsSync(attemptPath)) {
      const existing = readJson(attemptPath);
      const registry = readJson(registryPath);
      if (
        existing.attemptId === attemptId &&
        registry.attempts.some((row) => row.attemptId === attemptId)
      ) {
        return {
          operation: "allocate",
          idempotent: true,
          attemptId,
          candidateId,
          activeAttemptId: registry.c35?.activeAttemptId ?? null,
          pass: true
        };
      }
      throw new Error("Candidate 2 allocation target already exists inconsistently");
    }
    if (sha256File(registryPath) !== expected.registryBefore) {
      throw new Error("Canonical registry identity changed before Candidate 2 allocation");
    }
    if (sha256File(c35WalPath) !== expected.c35WalBefore || walRows().length !== 3) {
      throw new Error("C35 WAL identity changed before Candidate 2 allocation");
    }

    const registry = readJson(registryPath);
    if (!Array.isArray(registry.attempts) || registry.attempts.length !== 229) {
      throw new Error("Canonical registry count is not the authorized 229");
    }
    validateCandidate1(registry);
    if (registry.c35?.activeAttemptId != null || registry.attempts.some((row) => row.status === "running")) {
      throw new Error("Another attempt is active");
    }
    if (registry.attempts.some((row) => row.attemptId === attemptId || row.candidateId === candidateId)) {
      throw new Error("Duplicate Candidate 2 attempt or candidate");
    }

    const startedAt = "2026-07-31T05:07:02.643Z";
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
    registry.cumulativeThrough = "commit5r1c35-candidate2-active";
    registry.summary.totalAttempts = registry.attempts.length;
    registry.summary.total = registry.attempts.length;
    registry.summary.byCategory.trust_calibration =
      Number(registry.summary.byCategory.trust_calibration || 0) + 1;
    registry.summary.nonControlling = Number(registry.summary.nonControlling || 0) + 1;
    registry.summary.c35RunningAttemptIds = [attemptId];
    registry.summary.c35OrphanAttemptIds = [];
    registry.summary.c35DanglingAttemptIds = [];
    registry.c35 = {
      ...registry.c35,
      candidateLimit: 2,
      allocatedCandidateIds: [candidate1Id, candidateId],
      activeAttemptId: attemptId,
      provisionalSelection: registry.c35?.provisionalSelection || null,
      candidate2NecessityDecision: "C35_CANDIDATE_2_REQUIRED"
    };
    atomicWrite(registryPath, stableJson(registry));
    appendWal({
      event: "ALLOCATION_REGISTERED",
      at: "2026-07-31T05:07:02.644Z",
      attemptId,
      candidateId
    });

    return {
      operation: "allocate",
      idempotent: false,
      attemptId,
      candidateId,
      registryAttempts: registry.attempts.length,
      registrySha256: sha256File(registryPath),
      c35WalRows: walRows().length,
      c35WalSha256: sha256File(c35WalPath),
      c34WalSha256: sha256File(c34WalPath),
      candidate1ActiveBase: expected.candidate1Runtime,
      activeAttemptId: attemptId,
      pass: true
    };
  });
}

function terminalize() {
  return withAllocationLock(() => {
    ensureCommonIdentity();
    if (!fs.existsSync(attemptPath)) throw new Error("Candidate 2 attempt is not allocated");
    const lines = walRows();
    if (lines.length === 6) {
      const existing = readJson(attemptPath);
      if (existing.status !== "completed") throw new Error("Six-row WAL has non-terminal attempt");
      return {
        operation: "terminalize",
        idempotent: true,
        attemptId,
        disposition: existing.disposition,
        pass: true
      };
    }
    if (lines.length !== 5) throw new Error(`Unexpected C35 WAL row count: ${lines.length}`);

    const resultPath = path.join(resultRoot, "COMMIT_5R1C35_CANDIDATE_2_RESULT.json");
    const replayPath = path.join(resultRoot, "COMMIT_5R1C35_CANDIDATE_2_REPLAY.json");
    const compatibilityPath = path.join(resultRoot, "COMMIT_5R1C35_CANDIDATE_2_COMPATIBILITY_VALIDATION.json");
    for (const required of [resultPath, replayPath, compatibilityPath]) {
      if (!fs.existsSync(required)) throw new Error(`Missing required Candidate 2 evidence: ${required}`);
    }
    const result = readJson(resultPath);
    if (result.verdict !== "ACCEPTED_PROMOTED_CONTROLLING" || result.pass !== true) {
      throw new Error("Candidate 2 result does not authorize terminalization");
    }

    const registry = readJson(registryPath);
    validateCandidate1(registry);
    const index = registry.attempts.findIndex((row) => row.attemptId === attemptId);
    if (index < 0) throw new Error("Allocated Candidate 2 is missing from registry");
    const attempt = registry.attempts[index];
    if (attempt.status !== "running") throw new Error(`Unexpected Candidate 2 status: ${attempt.status}`);

    const endedAt = result.generatedUtc;
    const resultPaths = [resultPath, replayPath, compatibilityPath]
      .map((file) => path.relative(repo, file).replaceAll("\\", "/"));
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
    registry.cumulativeThrough = "commit5r1c35-candidate-chain-terminal";
    registry.summary.controlling = Number(registry.summary.controlling || 0) + 1;
    registry.summary.nonControlling = Math.max(0, Number(registry.summary.nonControlling || 0) - 1);
    registry.summary.c35RunningAttemptIds = [];
    registry.c35.activeAttemptId = null;
    registry.c35.candidateChain = [
      {
        attemptId: candidate1AttemptId,
        candidateId: candidate1Id,
        disposition: "ACCEPTED_PROMOTED_CONTROLLING",
        candidateRuntimeHash: expected.candidate1Runtime
      },
      {
        attemptId,
        candidateId,
        disposition: "ACCEPTED_PROMOTED_CONTROLLING",
        candidateRuntimeHash: result.candidateRuntimeHash
      }
    ];
    registry.c35.provisionalSelection = {
      attemptId,
      candidateId,
      disposition: "ACCEPTED_PROMOTED_CONTROLLING",
      candidateRuntimeHash: result.candidateRuntimeHash,
      compositionIncludesCandidate1: true,
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
      c35WalRows: walRows().length,
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
  throw new Error("Usage: node commit5r1c35-candidate2.mjs allocate|terminalize");
}
