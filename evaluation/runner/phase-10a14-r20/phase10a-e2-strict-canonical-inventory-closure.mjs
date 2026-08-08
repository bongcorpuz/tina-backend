import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const IDENTITY = "PHASE-10A14-E2-STRICT-CANONICAL-PRIOR-PROBE-INVENTORY-CLOSURE-1";
const EXPECTED_BRANCH = "feature/source-availability-engine-v1";
const EXPECTED_HEAD = "ae01a08b0faffd95ee52096c53d2199270d7dccc";
const ROOT = process.cwd();
const OUTPUT_DIR =
  "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_1";
const INVENTORY_PATH =
  "evaluation/results/phase-10a14-r9/CANONICAL_A12_R8_INVENTORY.json";

const PROTECTED = Object.freeze({
  "security/public-health.js":
    "3c870d309a66fb1f36cc8c16fb759e1e7a9887c3d2fd80800cd8062608c528f0",
  "server.js": "beb3ab375892fac74557f1b0e5b6c633abb2edea25b3ee68e47d44a45971f4da",
  "tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs":
    "8ceed37b6023119760bef7c96435d06042d837f2ac69cb562f02cd1c60cded35",
});

const CONTROLLING_SOURCES = Object.freeze([
  "PHASE-10A14-R9-CALENDAR-RELATIVE-DEADLINE-FILING-RATIONALE-ALIGNMENT-AND-CANONICAL-INVENTORY-CLOSURE-REMEDIATION-1-INDEPENDENT-REVIEW-1_REPORT.md",
  "evaluation/results/phase-10a14-r9-independent-review-1/strict-319-probe-inventory-audit.md",
  INVENTORY_PATH,
  "evaluation/results/phase-10a14-r9/WS10_A12_A13_R4R8_TESTMAP.md",
  "PHASE-10A14-R10-CALENDAR-RELATIVE-PUBLIC-ANSWER-REPLACEMENT-AND-PERSISTENCE-SAFETY-REMEDIATION-1_REPORT.md",
]);

const PREREQUISITE_EVIDENCE = Object.freeze([
  {
    claim: "C37 terminal",
    path: "evaluation/results/phase-10a14-r20/COMMIT_5R1C37_CHECKPOINT_84_C37_TERMINALITY_ADJUDICATION.json",
  },
  {
    claim: "C38 terminal",
    path: "evaluation/results/phase-10a14-r20/COMMIT_5R1C38_FINAL_OUTPUT.json",
  },
  {
    claim: "post-C38 external review gate SATISFIED",
    path:
      "evaluation/results/phase-10a14-r20/COMMIT_5R1_POST_C38_INDEPENDENT_REVIEW_1_EXTERNAL_REVIEW_RESULT.json",
  },
]);

const TEST_PATHS = Object.freeze([
  "tests/phase-10a12-validator-competence-remediation-1.test.mjs",
  "tests/phase-10a12-r2-validator-competence-remediation-2.test.mjs",
  "tests/phase-10a12-r3-validator-competence-remediation-3.test.mjs",
  "tests/phase-10a12-r6-proposition-source-sufficiency.test.mjs",
  "tests/phase-10a13-r1-proposition-source-sufficiency.test.mjs",
  "tests/phase-10a14-r1-filing-deadline-taxbase-source-sufficiency.test.mjs",
  "tests/phase-10a14-r2-filing-estate-semantic-proposition-coverage.test.mjs",
  "tests/phase-10a14-r3-multi-proposition-filing-authority-estate-sufficiency.test.mjs",
  "tests/phase-10a14-r4-sec51-filing-authority-bridge.test.mjs",
  "tests/phase-10a14-r5-section51-current-law-chain-and-imperative-filing.test.mjs",
  "tests/phase-10a14-r6-temporal-card-propagation-and-51a-origin.test.mjs",
  "tests/phase-10a14-r7-exact-date-section51c2-effectivity.test.mjs",
  "tests/phase-10a14-r8-ra12214-qualifying-publication-strict-date-fail-closed.test.mjs",
]);

const EXPECTED_ORIGIN_COUNTS = Object.freeze({
  A14: 50,
  "A14-slot": 26,
  "A14-R1": 26,
  "A14-R2": 42,
  "A14-R3": 60,
  E1: 115,
});

const MATERIAL_FIELDS = Object.freeze([
  "propositionClass",
  "expectedTrustBehavior",
  "existingE1Payload",
  "finalR9ExecutionId",
]);

let headBlobOids = new Map();
let modifiedTrackedPaths = new Set();

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeText(value) {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

function toPosix(value) {
  return value.replace(/\\/gu, "/");
}

function abs(relativePath) {
  assert(typeof relativePath === "string" && relativePath.length > 0, "path is required");
  const resolved = path.resolve(ROOT, relativePath);
  const relative = path.relative(ROOT, resolved);
  assert(
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative),
    `path escapes repository root: ${relativePath}`,
  );
  return resolved;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: Object.hasOwn(options, "encoding") ? options.encoding : "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function gitText(...args) {
  const result = run("git", args);
  assert(result.status === 0, `git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function readJson(relativePath) {
  const bytes = fs.readFileSync(abs(relativePath));
  try {
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  } catch (error) {
    fail(`invalid JSON in ${relativePath}: ${error.message}`);
  }
}

function lockTrackedInput(relativePath) {
  const filePath = abs(relativePath);
  assert(fs.existsSync(filePath), `missing governed input: ${relativePath}`);
  assert(fs.statSync(filePath).isFile(), `governed input is not a file: ${relativePath}`);
  const bytes = fs.readFileSync(filePath);
  const actualSha256 = sha256(bytes);
  const normalizedPath = toPosix(relativePath);
  const headGitBlobOid = headBlobOids.get(normalizedPath);
  assert(headGitBlobOid, `governed input is not tracked at ${EXPECTED_HEAD}: ${relativePath}`);
  assert(
    !modifiedTrackedPaths.has(normalizedPath),
    `governed input differs from ${EXPECTED_HEAD} after repository clean filters: ${relativePath}`,
  );
  return {
    path: normalizedPath,
    sha256: actualSha256,
    headGitBlobOid,
    bytes: bytes.length,
    contentIdenticalToStartingHeadUnderGitAttributes: true,
  };
}

function parseArguments(argv) {
  if (argv.length === 1 && argv[0] === "--verify-only") {
    return { mode: "VERIFY_ONLY", outputDir: null };
  }
  if (argv.length === 2 && argv[0] === "--out") {
    const supplied = toPosix(argv[1]).replace(/^\.\//u, "").replace(/\/$/u, "");
    assert(supplied === OUTPUT_DIR, `--out must equal ${OUTPUT_DIR}`);
    return { mode: "OUTPUT", outputDir: supplied };
  }
  fail(`usage: node ${toPosix(path.relative(ROOT, import.meta.filename))} --verify-only | --out ${OUTPUT_DIR}`);
}

function assertPreconditions(mode) {
  const canonicalRoot = path.resolve(gitText("rev-parse", "--show-toplevel"));
  assert(
    canonicalRoot.toLowerCase() === path.resolve(ROOT).toLowerCase(),
    `runner must execute from canonical repository root ${canonicalRoot}`,
  );
  assert(gitText("branch", "--show-current") === EXPECTED_BRANCH, "unexpected branch");
  assert(gitText("rev-parse", "HEAD") === EXPECTED_HEAD, "unexpected starting HEAD");
  assert(gitText("diff", "--cached", "--name-only") === "", "staged paths are not allowed");

  const tree = gitText("ls-tree", "-r", EXPECTED_HEAD);
  headBlobOids = new Map(
    tree.split(/\r?\n/u).map((line) => {
      const match = /^(?:\d+) blob ([0-9a-f]+)\t(.+)$/u.exec(line);
      assert(match, `unable to parse starting-HEAD tree entry: ${line}`);
      return [toPosix(match[2]), match[1]];
    }),
  );
  const modified = gitText("diff", "--name-only", EXPECTED_HEAD, "--");
  modifiedTrackedPaths = new Set(
    modified.length === 0 ? [] : modified.split(/\r?\n/u).map(toPosix),
  );

  const outputPath = abs(OUTPUT_DIR);
  assert(!fs.existsSync(outputPath), `refusing to overwrite existing output directory: ${OUTPUT_DIR}`);
  if (mode === "OUTPUT") {
    const parent = path.dirname(outputPath);
    assert(fs.existsSync(parent) && fs.statSync(parent).isDirectory(), "output parent is missing");
  }
}

function verifyProtectedFiles() {
  return Object.entries(PROTECTED).map(([relativePath, expectedSha256]) => {
    const bytes = fs.readFileSync(abs(relativePath));
    const actualSha256 = sha256(bytes);
    assert(
      actualSha256 === expectedSha256,
      `protected-file hash mismatch for ${relativePath}: expected ${expectedSha256}, got ${actualSha256}`,
    );
    return { path: relativePath, expectedSha256, actualSha256, pass: true };
  });
}

function payloadPathFor(record) {
  const id = record.originalProbeId;
  switch (record.originatingTask) {
    case "A14":
      assert(id.startsWith("A14:Q"), `invalid A14 originalProbeId: ${id}`);
      return `evaluation/results/phase-10a14-full-factcheck-rerun-4/payloads/${id.slice(4)}-r1.json`;
    case "A14-slot":
      assert(
        typeof record.finalR9ExecutionId === "string" && record.finalR9ExecutionId.length > 0,
        `A14-slot record has no finalR9ExecutionId: ${id}`,
      );
      return `evaluation/results/phase-10a14-r9/raw/payloads/${record.finalR9ExecutionId}.json`;
    case "A14-R1":
      return `evaluation/results/phase-10a14-r1-filing-obligation-deadline-tax-base-remediation-1/payloads/${id.slice("A14-R1:".length)}.json`;
    case "A14-R2":
      return `evaluation/results/phase-10a14-r2-filing-estate-semantic-proposition-coverage-remediation-1/payloads/${id.slice("A14-R2:".length)}.json`;
    case "A14-R3":
      return `evaluation/results/phase-10a14-r3-multi-proposition-filing-authority-estate-sufficiency-remediation-1/payloads/${id.slice("A14-R3:".length)}.json`;
    case "E1":
      assert(
        typeof record.existingE1Payload === "string" && record.existingE1Payload.length > 0,
        `E1 record has no existingE1Payload: ${id}`,
      );
      return `evaluation/results/${record.existingE1Payload}`;
    default:
      fail(`unsupported originatingTask for ${id}: ${record.originatingTask}`);
  }
}

function resolveMaterialField(record, field) {
  const value = record[field];
  if (value !== null && value !== undefined) {
    return {
      resolution: "ASSERTED_BY_HISTORIC_SOURCE",
      assertedValue: value,
      justification: `Copied without reinterpretation from the immutable ${INVENTORY_PATH} source record.`,
    };
  }
  return {
    resolution: "NOT_ASSERTED_BY_HISTORIC_SOURCE",
    assertedValue: "NOT_ASSERTED",
    justification:
      field === "existingE1Payload" || field === "finalR9ExecutionId"
        ? "The historic inventory did not assert this optional legacy pointer; finalEvidence supplies the exact immutable payload mapping required for closure."
        : "The historic inventory did not assert this semantic classification; E2 records that nonassertion explicitly and does not fabricate a legal or trust classification.",
  };
}

function questionFromPayload(payload, evidencePath) {
  for (const field of ["exactQuestion", "prompt", "question"]) {
    if (typeof payload[field] === "string" && payload[field].trim().length > 0) {
      return { field, value: payload[field] };
    }
  }
  fail(`payload has no question-bearing field: ${evidencePath}`);
}

function buildLegacyRecords(inventory) {
  assert(Array.isArray(inventory.probes), "inventory.probes must be an array");
  assert(inventory.probes.length === 319, `inventory has ${inventory.probes.length} probes, expected 319`);
  assert(inventory.totalOriginalProbes === 319, "inventory totalOriginalProbes must be 319");

  const ids = new Set();
  const origins = {};
  const payloadInputs = [];
  const records = inventory.probes.map((record, index) => {
    assert(record && typeof record === "object", `inventory probe ${index} is not an object`);
    assert(
      typeof record.originalProbeId === "string" && record.originalProbeId.length > 0,
      `inventory probe ${index} has no originalProbeId`,
    );
    assert(!ids.has(record.originalProbeId), `duplicate originalProbeId: ${record.originalProbeId}`);
    ids.add(record.originalProbeId);
    origins[record.originatingTask] = (origins[record.originatingTask] ?? 0) + 1;
    assert(
      typeof record.exactQuestion === "string" && record.exactQuestion.length > 0,
      `missing exactQuestion for ${record.originalProbeId}`,
    );

    const evidencePath = payloadPathFor(record);
    const locked = lockTrackedInput(evidencePath);
    const payload = readJson(evidencePath).value;
    const payloadQuestion = questionFromPayload(payload, evidencePath);
    const normalizedInventoryQuestion = normalizeText(record.exactQuestion);
    const normalizedPayloadQuestion = normalizeText(payloadQuestion.value);
    assert(
      normalizedInventoryQuestion === normalizedPayloadQuestion,
      `question mismatch for ${record.originalProbeId} at ${evidencePath}`,
    );
    payloadInputs.push(locked);

    const resolvedMaterialFields = Object.fromEntries(
      MATERIAL_FIELDS.map((field) => [field, resolveMaterialField(record, field)]),
    );
    for (const [field, resolution] of Object.entries(resolvedMaterialFields)) {
      assert(resolution !== null, `unresolved material field ${field} for ${record.originalProbeId}`);
      assert(
        Object.values(resolution).every((value) => value !== null && value !== undefined),
        `null remains in resolved material field ${field} for ${record.originalProbeId}`,
      );
    }

    return {
      inventoryOrdinal: index + 1,
      originalProbeId: record.originalProbeId,
      originatingTask: record.originatingTask,
      exactQuestion: record.exactQuestion,
      originalSourceRecord: record,
      resolvedMaterialFields,
      finalEvidence: {
        path: evidencePath,
        sha256: locked.sha256,
        bytes: locked.bytes,
        questionField: payloadQuestion.field,
        normalizedExactQuestion: normalizedInventoryQuestion,
        normalizedPayloadQuestion,
        exactQuestionMatch: true,
        contentIdenticalToStartingHeadUnderGitAttributes: true,
      },
    };
  });

  assert(ids.size === 319, `unique originalProbeId count is ${ids.size}, expected 319`);
  assert(
    JSON.stringify(origins) === JSON.stringify(EXPECTED_ORIGIN_COUNTS),
    `origin counts mismatch: ${JSON.stringify(origins)}`,
  );
  return { records, origins, payloadInputs };
}

function assertNoSecretLikeOutput(value, testPath) {
  const patterns = [
    /\bsk-[A-Za-z0-9_-]{16,}\b/u,
    /\b(?:api[_-]?key|authorization|bearer)\s*[:=]\s*[^\s]{8,}/iu,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  ];
  assert(!patterns.some((pattern) => pattern.test(value)), `secret-like output detected in ${testPath}`);
}

function executeTests() {
  const executions = [];
  const probes = [];
  for (const testPath of TEST_PATHS) {
    const lockedSource = lockTrackedInput(testPath);
    const result = run(process.execPath, [abs(testPath)]);
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    const combined = `${stdout}${stderr}`;
    assertNoSecretLikeOutput(combined, testPath);
    const labels = [...stdout.matchAll(/^PASS (.+)$/gmu)].map((match) => match[1]);
    const summaries = [
      ...stdout.matchAll(/(?:^|\n)(?:[^\n]*?:\s*)?(\d+) passed,\s*(\d+) failed(?:,\s*(\d+) assertions)?(?:\r?\n|$)/gmu),
    ];
    assert(result.status === 0, `${testPath} exited ${result.status}: ${stderr.trim()}`);
    assert(result.signal === null, `${testPath} ended with signal ${result.signal}`);
    assert(labels.length > 0, `${testPath} emitted no individual PASS labels`);
    assert(summaries.length === 1, `${testPath} emitted ${summaries.length} parseable summaries, expected 1`);
    const summary = summaries[0];
    const passed = Number(summary[1]);
    const failed = Number(summary[2]);
    const assertions = summary[3] === undefined ? "NOT_REPORTED" : Number(summary[3]);
    assert(failed === 0, `${testPath} reported ${failed} failures`);
    assert(passed === labels.length, `${testPath} reported ${passed} passes but emitted ${labels.length} labels`);

    const outputSha256 = sha256(Buffer.from(combined, "utf8"));
    executions.push({
      command: `node ${testPath}`,
      source: lockedSource,
      exitCode: result.status,
      signal: "NONE",
      passed,
      failed,
      assertions,
      individualPassLabelCount: labels.length,
      stdoutSha256: sha256(Buffer.from(stdout, "utf8")),
      stderrSha256: sha256(Buffer.from(stderr, "utf8")),
      combinedOutputSha256: outputSha256,
      pass: true,
      stdout,
      stderr,
    });
    labels.forEach((literalPassLabel, labelIndex) => {
      probes.push({
        sourceTestPath: testPath,
        sourceTestSha256: lockedSource.sha256,
        encodedProbeOrdinalWithinSource: labelIndex + 1,
        literalPassLabel,
        executionOutputSha256: outputSha256,
        classification:
          "CURRENT_DETERMINISTIC_TEST_ENCODED_PROBE; not asserted as a newly discovered historic probe ID",
      });
    });
  }
  return { executions, probes };
}

function compactExecution(execution) {
  const { stdout, stderr, ...rest } = execution;
  return rest;
}

function commandLog(executions) {
  return executions
    .map(
      (execution) =>
        [
          `COMMAND ${execution.command}`,
          `EXIT ${execution.exitCode}`,
          `SOURCE_SHA256 ${execution.source.sha256}`,
          `STDOUT_SHA256 ${execution.stdoutSha256}`,
          `STDERR_SHA256 ${execution.stderrSha256}`,
          `COMBINED_OUTPUT_SHA256 ${execution.combinedOutputSha256}`,
          "STDOUT_BEGIN",
          execution.stdout.replace(/\s+$/u, ""),
          "STDOUT_END",
          "STDERR_BEGIN",
          execution.stderr.replace(/\s+$/u, ""),
          "STDERR_END",
        ].join("\n"),
    )
    .join("\n\n")
    .concat("\n");
}

function aggregateInputHash(inputs) {
  const unique = new Map();
  for (const input of inputs) unique.set(input.path, input);
  const canonical = [...unique.values()]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(({ path: inputPath, sha256: inputSha256 }) => `${inputSha256}  ${inputPath}`)
    .join("\n")
    .concat("\n");
  return { count: unique.size, sha256: sha256(Buffer.from(canonical, "utf8")) };
}

function buildArtifacts(mode) {
  const protectedFiles = verifyProtectedFiles();
  const semanticInputs = CONTROLLING_SOURCES.map(lockTrackedInput);
  const prerequisiteEvidence = PREREQUISITE_EVIDENCE.map((item) => ({
    ...item,
    evidence: lockTrackedInput(item.path),
    classification: "PREREQUISITE_CLAIM_RECORDED_NOT_READJUDICATED_BY_E2",
  }));
  const inventory = readJson(INVENTORY_PATH).value;
  const legacy = buildLegacyRecords(inventory);
  const testRun = executeTests();
  const allInputs = [
    ...semanticInputs,
    ...prerequisiteEvidence.map((item) => item.evidence),
    ...legacy.payloadInputs,
    ...testRun.executions.map((item) => item.source),
  ];
  const inputSet = aggregateInputHash(allInputs);
  const totalAssertions = testRun.executions.reduce(
    (sum, execution) =>
      sum + (typeof execution.assertions === "number" ? execution.assertions : 0),
    0,
  );

  const contract = {
    identity: IDENTITY,
    semanticPurpose:
      "Evidence-only closure of P1-R9-IR-002: preserve and individually enumerate the strict canonical historic prior-probe inventory, map each record to exact immutable final evidence, and resolve material nulls without fabricating legal or trust classifications.",
    semanticSources: semanticInputs,
    startingHead: { branch: EXPECTED_BRANCH, commit: EXPECTED_HEAD, verified: true },
    prerequisites: prerequisiteEvidence,
    inputsAndHashes: {
      aggregate: inputSet,
      semanticAndPrerequisiteInputs: [
        ...semanticInputs,
        ...prerequisiteEvidence.map((item) => item.evidence),
      ],
      payloadInputs: {
        count: legacy.payloadInputs.length,
        exactPathAndHashRecordedPerLegacyRecord: true,
      },
      deterministicTestSources: testRun.executions.map((item) => item.source),
    },
    allowedPaths: [
      "evaluation/runner/phase-10a14-r20/phase10a-e2-strict-canonical-inventory-closure.mjs",
      `${OUTPUT_DIR}/**`,
    ],
    prohibitedPaths: [
      ...Object.keys(PROTECTED),
      "knowledge/CURRENT_STATE.md",
      "production/runtime paths",
      "B2-B6 artifacts",
      "existing evidence",
    ],
    commandsAndTests: {
      verifyOnly:
        "node evaluation/runner/phase-10a14-r20/phase10a-e2-strict-canonical-inventory-closure.mjs --verify-only",
      output:
        `node evaluation/runner/phase-10a14-r20/phase10a-e2-strict-canonical-inventory-closure.mjs --out ${OUTPUT_DIR}`,
      exactFocusedTests: TEST_PATHS.map((testPath) => `node ${testPath}`),
      genericNpmTestAuthorized: false,
      networkCallsAuthorized: false,
    },
    expectedOutputs: [
      "E2_EXECUTION_CONTRACT.json",
      "E2_STRICT_CANONICAL_INVENTORY.json",
      "E2_EXECUTION_RESULT.json",
      "E2_COMMAND_OUTPUT.log",
      "E2_EVIDENCE_MANIFEST.sha256",
    ],
    passCriteria: [
      "starting branch and HEAD exactly match the authorized identity and no paths are staged",
      "319 legacy probes and 319 unique original IDs are preserved",
      "all 319 probes map to an immutable payload with normalized exact-question equality",
      "every material legacy null has an explicit non-null resolution without invented semantics",
      "all 13 focused deterministic source suites exit 0, report zero failures, and expose individual literal PASS labels",
      "all governed inputs normalize through repository Git attributes to their exact starting-HEAD blobs, with raw working-tree SHA-256 recorded",
      "all three protected files match the authorized byte hashes",
      "captured output contains no recognized secret-like material",
    ],
    failureCriteria: [
      "identity, branch, HEAD, staging, path, input, hash, schema, uniqueness, mapping, question, test, protected-file, secret-scan, or output-collision assertion fails",
    ],
    evidence: {
      schema: "minimal exact-current-result JSON plus complete inventory, command log, and self-excluded SHA-256 manifest",
      historicalClaimsReAdjudicated: false,
    },
    review: {
      internalReviewRequired: true,
      internalReviewStatus: "PENDING_PLANNER_REVIEWER",
      externalReviewRequired: false,
      externalReviewReason: "No exact E2 external-review contract exists; owner default applies.",
    },
    currentState: { updateAuthorizedForThisRunner: false, updated: false },
    gitAndPublication: {
      stageCommitPushAuthorizedForThisRunner: false,
      status: "DEFERRED_TO_PLANNER_AFTER_INTERNAL_REVIEW",
    },
    b2ThroughB6: {
      disposition: "OWNER_ADJUDICATED_NONBLOCKING_AND_OUT_OF_SCOPE",
      modified: false,
    },
    rollback:
      "The runner never overwrites. If an output-mode write is interrupted, remove only the newly created exact E2 output directory after preserving diagnostic evidence; no runtime rollback is applicable because E2 is evidence-only.",
    invocationMode: mode,
  };

  const strictInventory = {
    identity: IDENTITY,
    startingHead: EXPECTED_HEAD,
    semanticClassification: "EVIDENCE_ONLY_HISTORIC_INVENTORY_CLOSURE",
    legacyInventory: {
      sourcePath: INVENTORY_PATH,
      sourceSha256: semanticInputs.find((item) => item.path === INVENTORY_PATH).sha256,
      recordCount: legacy.records.length,
      uniqueOriginalProbeIdCount: legacy.records.length,
      originCounts: legacy.origins,
      exactEvidenceMappings: legacy.records.length,
      normalizedQuestionMatches: legacy.records.length,
      unresolvedMaterialFieldCount: 0,
      records: legacy.records,
    },
    currentDeterministicTestEncodedProbes: {
      classification:
        "Current source-verification observations; these records individualize committed A12/A13/R4-R8 test cases without inventing historic probe IDs.",
      sourceSuiteCount: testRun.executions.length,
      probeCount: testRun.probes.length,
      records: testRun.probes,
    },
    limitations: [
      "E2 does not retroactively infer proposition classes or expected trust behavior absent from the historic source.",
      "Current deterministic test labels are source-verification observations, not newly asserted historic identifiers.",
      "Prerequisite terminality and external-review claims are recorded from their governed artifacts and are not re-adjudicated by this evidence-only runner.",
    ],
  };

  const result = {
    identity: IDENTITY,
    status: "PASS",
    pass: true,
    resultCode: "E2_STRICT_CANONICAL_INVENTORY_CLOSURE_PASS",
    startingHead: EXPECTED_HEAD,
    inputSet,
    checks: {
      legacyRecordCount: legacy.records.length,
      uniqueOriginalProbeIdCount: legacy.records.length,
      exactEvidenceMappingCount: legacy.records.length,
      normalizedQuestionMatchCount: legacy.records.length,
      unresolvedMaterialFieldCount: 0,
      deterministicSuiteCount: testRun.executions.length,
      deterministicSuitePassedCount: testRun.executions.length,
      deterministicSuiteFailedCount: 0,
      individualTestEncodedProbeCount: testRun.probes.length,
      reportedAssertionCountWhereAvailable: totalAssertions,
      protectedFileCount: protectedFiles.length,
      protectedFileMismatchCount: 0,
      secretLikeOutputFindingCount: 0,
    },
    protectedFiles,
    testExecutions: testRun.executions.map(compactExecution),
    governance: {
      productionOrRuntimeChanged: false,
      currentStateUpdated: false,
      b2ThroughB6Changed: false,
      externalReviewRequired: false,
      internalReviewRequired: true,
      publicationDeferred: true,
    },
  };

  return { contract, strictInventory, result, log: commandLog(testRun.executions) };
}

function writeArtifacts(artifacts) {
  const outputPath = abs(OUTPUT_DIR);
  fs.mkdirSync(outputPath, { recursive: false });
  const files = new Map([
    ["E2_EXECUTION_CONTRACT.json", jsonText(artifacts.contract)],
    ["E2_STRICT_CANONICAL_INVENTORY.json", jsonText(artifacts.strictInventory)],
    ["E2_EXECUTION_RESULT.json", jsonText(artifacts.result)],
    ["E2_COMMAND_OUTPUT.log", artifacts.log],
  ]);
  for (const [fileName, contents] of files) {
    fs.writeFileSync(path.join(outputPath, fileName), contents, { encoding: "utf8", flag: "wx" });
  }
  const manifest = [...files.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([fileName, contents]) => `${sha256(Buffer.from(contents, "utf8"))}  ${OUTPUT_DIR}/${fileName}`)
    .join("\n")
    .concat("\n");
  fs.writeFileSync(path.join(outputPath, "E2_EVIDENCE_MANIFEST.sha256"), manifest, {
    encoding: "utf8",
    flag: "wx",
  });
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  assertPreconditions(args.mode);
  const artifacts = buildArtifacts(args.mode);
  if (args.mode === "OUTPUT") writeArtifacts(artifacts);
  console.log(
    jsonText({
      identity: IDENTITY,
      mode: args.mode,
      status: artifacts.result.status,
      resultCode: artifacts.result.resultCode,
      legacyRecordCount: artifacts.result.checks.legacyRecordCount,
      deterministicSuiteCount: artifacts.result.checks.deterministicSuiteCount,
      individualTestEncodedProbeCount: artifacts.result.checks.individualTestEncodedProbeCount,
      inputSet: artifacts.result.inputSet,
      wroteOutput: args.mode === "OUTPUT",
      outputDirectory: args.mode === "OUTPUT" ? OUTPUT_DIR : "NOT_WRITTEN",
    }),
  );
}

try {
  main();
} catch (error) {
  console.error(
    jsonText({
      identity: IDENTITY,
      status: "FAIL",
      resultCode: "E2_STRICT_CANONICAL_INVENTORY_CLOSURE_FAIL",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
}
