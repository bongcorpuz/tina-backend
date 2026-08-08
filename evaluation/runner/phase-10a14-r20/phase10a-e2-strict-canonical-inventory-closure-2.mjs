import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { builtinModules, createRequire } from "node:module";

const IDENTITY = "PHASE-10A14-E2-STRICT-CANONICAL-PRIOR-PROBE-INVENTORY-CLOSURE-2";
const EXPECTED_BRANCH = "feature/source-availability-engine-v1";
const EXPECTED_HEAD = "ae01a08b0faffd95ee52096c53d2199270d7dccc";
const R9_FINAL_COMMIT = "c9dbba52e592de5c8e20b36933e08d93dd6cffa1";
const ROOT = process.cwd();
const RUNNER_PATH =
  "evaluation/runner/phase-10a14-r20/phase10a-e2-strict-canonical-inventory-closure-2.mjs";
const OUTPUT_DIR =
  "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_2";
const INVENTORY_PATH = "evaluation/results/phase-10a14-r9/CANONICAL_A12_R8_INVENTORY.json";
const PREDECESSOR_RUNNER =
  "evaluation/runner/phase-10a14-r20/phase10a-e2-strict-canonical-inventory-closure.mjs";
const PREDECESSOR_OUTPUT =
  "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_1";
const PREDECESSOR_MANIFEST_SHA256 =
  "a90187ab695d7a4520da4461d2b9b64c1173dfbaaf8bbea94c15e45d49d8985d";
const PACKAGE_JSON_PATH = "package.json";
const PACKAGE_LOCK_PATH = "package-lock.json";
const WORKSPACE_REQUIRE = createRequire(path.join(ROOT, PACKAGE_JSON_PATH));
const EXPECTED_NODE_RUNTIME = Object.freeze({
  version: "v24.19.0",
  platform: "win32",
  architecture: "x64",
});
const DOTENV_SENTINEL =
  "evaluation/runner/phase-10a14-r20/.env.e2-deliberately-nonexistent";
const NODE_BUILTINS = new Set(
  builtinModules.flatMap((name) => [name, name.replace(/^node:/u, "")]),
);

const TEST_PRELOAD_GUARD_SOURCE = String.raw`
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";

const denyNetwork = (surface) => function e2NetworkBlocked() {
  throw new Error("E2_TEST_ISOLATION_NETWORK_BLOCKED:" + surface);
};
globalThis.fetch = denyNetwork("global.fetch");
for (const [moduleValue, names, label] of [
  [http, ["request", "get"], "http"],
  [https, ["request", "get"], "https"],
  [net, ["connect", "createConnection"], "net"],
  [tls, ["connect"], "tls"],
]) {
  for (const name of names) moduleValue[name] = denyNetwork(label + "." + name);
}
if (net.Socket?.prototype?.connect) net.Socket.prototype.connect = denyNetwork("net.Socket.prototype.connect");
if (tls.TLSSocket?.prototype?.connect) tls.TLSSocket.prototype.connect = denyNetwork("tls.TLSSocket.prototype.connect");
for (const name of ["lookup", "lookupService", "resolve", "resolve4", "resolve6", "resolveAny", "resolveCaa", "resolveCname", "resolveMx", "resolveNaptr", "resolveNs", "resolvePtr", "resolveSoa", "resolveSrv", "resolveTxt", "reverse"]) {
  if (typeof dns[name] === "function") dns[name] = denyNetwork("dns." + name);
  if (dns.promises && typeof dns.promises[name] === "function") dns.promises[name] = denyNetwork("dns.promises." + name);
  if (dns.Resolver?.prototype && typeof dns.Resolver.prototype[name] === "function") dns.Resolver.prototype[name] = denyNetwork("dns.Resolver.prototype." + name);
  if (dns.promises?.Resolver?.prototype && typeof dns.promises.Resolver.prototype[name] === "function") dns.promises.Resolver.prototype[name] = denyNetwork("dns.promises.Resolver.prototype." + name);
}
const envPathBlocked = (value) => {
  if (typeof value === "number") return false;
  let text;
  if (value instanceof URL) text = value.protocol === "file:" ? decodeURIComponent(value.pathname) : value.href;
  else if (Buffer.isBuffer(value)) text = value.toString("utf8");
  else text = String(value);
  return /(?:^|[\\/])\.env(?:\.[^\\/]*)?$/iu.test(text);
};
const guardPath = (name, original) => function e2EnvReadGuard(first, ...rest) {
  if (envPathBlocked(first)) throw new Error("E2_TEST_ISOLATION_ENV_FILE_READ_BLOCKED:" + name);
  return original.call(this, first, ...rest);
};
for (const name of ["readFileSync", "readFile", "openSync", "open", "createReadStream"]) {
  if (typeof fs[name] === "function") fs[name] = guardPath("fs." + name, fs[name]);
}
for (const name of ["readFile", "open"]) {
  if (fs.promises && typeof fs.promises[name] === "function") fs.promises[name] = guardPath("fs.promises." + name, fs.promises[name]);
}
syncBuiltinESMExports();
`;
const TEST_PRELOAD_GUARD_URL =
  `data:text/javascript;charset=utf-8,${encodeURIComponent(TEST_PRELOAD_GUARD_SOURCE)}`;

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

const PREREQUISITES = Object.freeze([
  ["C37 terminal", "evaluation/results/phase-10a14-r20/COMMIT_5R1C37_CHECKPOINT_84_C37_TERMINALITY_ADJUDICATION.json"],
  ["C38 terminal", "evaluation/results/phase-10a14-r20/COMMIT_5R1C38_FINAL_OUTPUT.json"],
  [
    "post-C38 external review gate satisfied",
    "evaluation/results/phase-10a14-r20/COMMIT_5R1_POST_C38_INDEPENDENT_REVIEW_1_EXTERNAL_REVIEW_RESULT.json",
  ],
]);

const A12_ROOTS = Object.freeze([
  [1, "evaluation/results/phase-10a12-validator-competence-remediation-1/payloads", 48],
  [2, "evaluation/results/phase-10a12-validator-competence-remediation-2/payloads", 66],
  [3, "evaluation/results/phase-10a12-validator-competence-remediation-3/payloads", 66],
  [4, "evaluation/results/phase-10a12-validator-competence-remediation-4/payloads", 30],
  [5, "evaluation/results/phase-10a12-validator-competence-remediation-5/payloads", 30],
  [6, "evaluation/results/phase-10a12-validator-competence-remediation-6/payloads", 38],
]);
const A13_ROOT = "evaluation/results/phase-10a13-full-factcheck-rerun-3/payloads";
const A13_R1_ROOT =
  "evaluation/results/phase-10a13-r1-proposition-source-sufficiency-remediation-1/payloads";

const TEST_SPECS = Object.freeze([
  ["tests/phase-10a12-validator-competence-remediation-1.test.mjs", 19, "R9_CANONICAL"],
  ["tests/phase-10a12-r2-validator-competence-remediation-2.test.mjs", 10, "R9_CANONICAL"],
  ["tests/phase-10a12-r3-validator-competence-remediation-3.test.mjs", 20, "R9_CANONICAL"],
  ["tests/phase-10a12-r6-proposition-source-sufficiency.test.mjs", 18, "R9_CANONICAL"],
  ["tests/phase-10a13-r1-proposition-source-sufficiency.test.mjs", 17, "R9_CANONICAL"],
  ["tests/phase-10a14-r1-filing-deadline-taxbase-source-sufficiency.test.mjs", 16, "SUPPLEMENTAL"],
  ["tests/phase-10a14-r2-filing-estate-semantic-proposition-coverage.test.mjs", 33, "SUPPLEMENTAL"],
  ["tests/phase-10a14-r3-multi-proposition-filing-authority-estate-sufficiency.test.mjs", 35, "SUPPLEMENTAL"],
  ["tests/phase-10a14-r4-sec51-filing-authority-bridge.test.mjs", 20, "R9_CANONICAL"],
  ["tests/phase-10a14-r5-section51-current-law-chain-and-imperative-filing.test.mjs", 25, "R9_CANONICAL"],
  ["tests/phase-10a14-r6-temporal-card-propagation-and-51a-origin.test.mjs", 15, "R9_CANONICAL"],
  ["tests/phase-10a14-r7-exact-date-section51c2-effectivity.test.mjs", 14, "R9_CANONICAL"],
  ["tests/phase-10a14-r8-ra12214-qualifying-publication-strict-date-fail-closed.test.mjs", 26, "R9_CANONICAL"],
]);

const MATERIAL_FIELDS = Object.freeze([
  "propositionClass",
  "expectedTrustBehavior",
  "existingE1Payload",
  "finalR9ExecutionId",
]);
const DATA_FILES = Object.freeze([
  "E2_EXECUTION_CONTRACT.json",
  "E2_STRICT_CANONICAL_INVENTORY.json",
  "E2_EXECUTION_RESULT.json",
  "E2_COMMAND_OUTPUT.log",
]);
const MANIFEST_FILE = "E2_EVIDENCE_MANIFEST.sha256";

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

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
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
  assert(relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative), `path escapes repository root: ${relativePath}`);
  return resolved;
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function safeTestEnvironment() {
  const sentinel = abs(DOTENV_SENTINEL);
  assert(!fs.existsSync(sentinel), `dotenv sentinel must not exist: ${DOTENV_SENTINEL}`);
  return {
    NODE_ENV: "test",
    TZ: "UTC",
    DOTENV_CONFIG_PATH: sentinel,
    DOTENV_CONFIG_QUIET: "true",
    OPENAI_API_KEY: "e2-inert-placeholder-not-a-secret",
    SUPABASE_URL: "https://e2-isolation.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "e2-inert-placeholder-not-a-secret",
  };
}

function runIsolatedTest(testPath) {
  return spawnSync(process.execPath, ["--import", TEST_PRELOAD_GUARD_URL, abs(testPath)], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    env: safeTestEnvironment(),
  });
}

function gitText(...args) {
  const result = run("git", args);
  assert(result.status === 0, `git ${args.join(" ")} failed: ${(result.stderr ?? "").trim()}`);
  return (result.stdout ?? "").trim();
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
  const normalizedPath = toPosix(relativePath);
  const filePath = abs(normalizedPath);
  assert(fs.existsSync(filePath) && fs.statSync(filePath).isFile(), `missing governed file: ${normalizedPath}`);
  const headGitBlobOid = headBlobOids.get(normalizedPath);
  assert(headGitBlobOid, `file is not tracked at starting HEAD: ${normalizedPath}`);
  assert(!modifiedTrackedPaths.has(normalizedPath), `file differs from starting HEAD after Git filters: ${normalizedPath}`);
  const bytes = fs.readFileSync(filePath);
  return {
    path: normalizedPath,
    sha256: sha256(bytes),
    bytes: bytes.length,
    headGitBlobOid,
    contentIdenticalToStartingHeadUnderGitAttributes: true,
  };
}

function parseArguments(argv) {
  if (argv.length === 1 && argv[0] === "--verify-only") return { mode: "VERIFY_ONLY" };
  if (argv.length === 1 && argv[0] === "--verify-evidence") return { mode: "VERIFY_EVIDENCE" };
  if (argv.length === 2 && argv[0] === "--out") {
    const supplied = toPosix(argv[1]).replace(/^\.\//u, "").replace(/\/$/u, "");
    assert(supplied === OUTPUT_DIR, `--out must equal ${OUTPUT_DIR}`);
    return { mode: "OUTPUT" };
  }
  fail(`usage: node ${RUNNER_PATH} --verify-only | --verify-evidence | --out ${OUTPUT_DIR}`);
}

function assertPreconditions(mode) {
  const canonicalRoot = path.resolve(gitText("rev-parse", "--show-toplevel"));
  assert(canonicalRoot.toLowerCase() === path.resolve(ROOT).toLowerCase(), `runner must execute from ${canonicalRoot}`);
  assert(gitText("branch", "--show-current") === EXPECTED_BRANCH, "unexpected branch");
  assert(gitText("rev-parse", "HEAD") === EXPECTED_HEAD, "unexpected starting HEAD");
  assert(gitText("diff", "--cached", "--name-only") === "", "staged paths are not allowed");
  assertRuntimeIdentity();
  const tree = gitText("ls-tree", "-r", EXPECTED_HEAD);
  headBlobOids = new Map(tree.split(/\r?\n/u).map((line) => {
    const match = /^(?:\d+) blob ([0-9a-f]+)\t(.+)$/u.exec(line);
    assert(match, `cannot parse starting-HEAD tree entry: ${line}`);
    return [toPosix(match[2]), match[1]];
  }));
  const modified = gitText("diff", "--name-only", EXPECTED_HEAD, "--");
  modifiedTrackedPaths = new Set(modified === "" ? [] : modified.split(/\r?\n/u).map(toPosix));
  const outputPath = abs(OUTPUT_DIR);
  if (mode === "OUTPUT") {
    assert(!fs.existsSync(outputPath), `refusing to overwrite existing v2 output: ${OUTPUT_DIR}`);
    assert(fs.statSync(path.dirname(outputPath)).isDirectory(), "output parent is missing");
  } else if (mode === "VERIFY_EVIDENCE") {
    assert(fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory(), `v2 output does not exist: ${OUTPUT_DIR}`);
  }
}

function verifyProtectedFiles() {
  return Object.entries(PROTECTED).map(([relativePath, expectedSha256]) => {
    const actualSha256 = sha256(fs.readFileSync(abs(relativePath)));
    assert(actualSha256 === expectedSha256, `protected-file hash mismatch: ${relativePath}`);
    return { path: relativePath, expectedSha256, actualSha256, pass: true };
  });
}

function rawRunnerIdentity() {
  const bytes = fs.readFileSync(abs(RUNNER_PATH));
  assert(!headBlobOids.has(RUNNER_PATH), "revision-2 runner unexpectedly exists in starting HEAD");
  return { path: RUNNER_PATH, sha256: sha256(bytes), bytes: bytes.length, startingHeadTracked: false, identityKind: "NEW_RUNNER_RAW_WORKTREE_BYTES" };
}

function rawPathIdentity(relativePath, identityKind) {
  const bytes = fs.readFileSync(abs(relativePath));
  return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length, identityKind };
}

function currentTrackedDirtyPaths() {
  const dirty = gitText("diff", "--name-only", EXPECTED_HEAD, "--");
  return dirty === "" ? [] : dirty.split(/\r?\n/u).map(toPosix).sort(compareText);
}

function runtimeIdentity() {
  const actual = {
    implementation: process.release.name,
    version: process.version,
    nodeVersion: process.versions.node,
    platform: process.platform,
    architecture: process.arch,
  };
  const pass =
    actual.version === EXPECTED_NODE_RUNTIME.version &&
    actual.platform === EXPECTED_NODE_RUNTIME.platform &&
    actual.architecture === EXPECTED_NODE_RUNTIME.architecture;
  return { expected: EXPECTED_NODE_RUNTIME, actual, pass };
}

function assertRuntimeIdentity() {
  const identity = runtimeIdentity();
  assert(
    identity.pass,
    `Node runtime identity mismatch: expected ${JSON.stringify(identity.expected)}, got ${JSON.stringify(identity.actual)}`,
  );
  return identity;
}

function resolution(state, value, evidencePath, justification, jsonPointer) {
  assert(["ASSERTED_BY_SOURCE", "NOT_ASSERTED_BY_SOURCE", "NOT_APPLICABLE_TO_RECORD_KIND"].includes(state), `bad resolution state ${state}`);
  const result = { state, value, evidencePath, justification };
  if (jsonPointer !== undefined) result.jsonPointer = jsonPointer;
  assert(Object.values(result).every((item) => item !== null && item !== undefined), "raw null in resolution object");
  return result;
}

function legacyMaterialResolutions(record, index) {
  return Object.fromEntries(MATERIAL_FIELDS.map((field) => {
    const value = record[field];
    return [field, value !== null && value !== undefined
      ? resolution("ASSERTED_BY_SOURCE", value, INVENTORY_PATH, "Copied verbatim from the immutable legacy inventory; no semantic reinterpretation.", `/probes/${index}/${field}`)
      : resolution("NOT_ASSERTED_BY_SOURCE", "NOT_ASSERTED", INVENTORY_PATH, "The legacy inventory does not assert this field; E2 does not invent legal or trust semantics.", `/probes/${index}/${field}`)];
  }));
}

function nativeMaterialResolutions(payload, evidencePath) {
  return {
    propositionClass: Object.hasOwn(payload, "propositionClass")
      ? resolution("ASSERTED_BY_SOURCE", payload.propositionClass, evidencePath, "Copied only because the payload explicitly asserts propositionClass.", "/propositionClass")
      : resolution("NOT_ASSERTED_BY_SOURCE", "NOT_ASSERTED", evidencePath, "No propositionClass is asserted; it is not inferred from prompt, answer, labels, or observed trust output."),
    expectedTrustBehavior: Object.hasOwn(payload, "expectedTrustBehavior")
      ? resolution("ASSERTED_BY_SOURCE", payload.expectedTrustBehavior, evidencePath, "Copied only because the payload explicitly asserts expectedTrustBehavior.", "/expectedTrustBehavior")
      : resolution("NOT_ASSERTED_BY_SOURCE", "NOT_ASSERTED", evidencePath, "No expected trust behavior is asserted; observed trust.authoritySupport is actual output and is not reclassified as expected behavior."),
    existingE1Payload: resolution("NOT_APPLICABLE_TO_RECORD_KIND", "NOT_APPLICABLE", evidencePath, "This payload-native record is not a legacy E1 pointer record."),
    finalR9ExecutionId: resolution("NOT_APPLICABLE_TO_RECORD_KIND", "NOT_APPLICABLE", evidencePath, "This payload-native record is not a legacy R9-slot pointer record."),
  };
}

function testMaterialResolutions(testPath) {
  return {
    propositionClass: resolution("NOT_ASSERTED_BY_SOURCE", "NOT_ASSERTED", testPath, "The literal PASS case does not assert a propositionClass; none is inferred."),
    expectedTrustBehavior: resolution("NOT_ASSERTED_BY_SOURCE", "NOT_ASSERTED", testPath, "The literal PASS case is observed verification output, not an inferred expected-trust classification."),
    existingE1Payload: resolution("NOT_APPLICABLE_TO_RECORD_KIND", "NOT_APPLICABLE", testPath, "A source-test case is not a legacy E1 payload pointer."),
    finalR9ExecutionId: resolution("NOT_APPLICABLE_TO_RECORD_KIND", "NOT_APPLICABLE", testPath, "A source-test case is not a legacy R9 execution-slot pointer."),
  };
}

function legacyPayloadPath(record) {
  const id = record.originalProbeId;
  switch (record.originatingTask) {
    case "A14": return `evaluation/results/phase-10a14-full-factcheck-rerun-4/payloads/${id.slice(4)}-r1.json`;
    case "A14-slot": return `evaluation/results/phase-10a14-r9/raw/payloads/${record.finalR9ExecutionId}.json`;
    case "A14-R1": return `evaluation/results/phase-10a14-r1-filing-obligation-deadline-tax-base-remediation-1/payloads/${id.slice(7)}.json`;
    case "A14-R2": return `evaluation/results/phase-10a14-r2-filing-estate-semantic-proposition-coverage-remediation-1/payloads/${id.slice(7)}.json`;
    case "A14-R3": return `evaluation/results/phase-10a14-r3-multi-proposition-filing-authority-estate-sufficiency-remediation-1/payloads/${id.slice(7)}.json`;
    case "E1": return `evaluation/results/${record.existingE1Payload}`;
    default: fail(`unsupported legacy originatingTask: ${record.originatingTask}`);
  }
}

function validateLegacyPayload(payload, evidencePath) {
  const idField = typeof payload.id === "string" ? "id" : typeof payload.probeId === "string" ? "probeId" : null;
  const promptField = typeof payload.prompt === "string" ? "prompt" : typeof payload.exactQuestion === "string" ? "exactQuestion" : null;
  assert(idField && payload[idField].length > 0, `legacy payload lacks its source-schema id/probeId: ${evidencePath}`);
  assert(promptField && payload[promptField].length > 0, `legacy payload lacks its source-schema prompt/exactQuestion: ${evidencePath}`);
  return { idField, promptField, id: payload[idField], prompt: payload[promptField] };
}

function validateNativePayload(payload, evidencePath) {
  assert(payload && typeof payload === "object" && !Array.isArray(payload), `payload is not an object: ${evidencePath}`);
  assert(typeof payload.id === "string" && payload.id.length > 0, `payload.id missing: ${evidencePath}`);
  assert(typeof payload.prompt === "string" && payload.prompt.length > 0, `payload.prompt missing: ${evidencePath}`);
  return payload;
}

function buildLegacyRecords(inventory) {
  assert(Array.isArray(inventory.probes) && inventory.probes.length === 319, "legacy inventory must contain 319 probes");
  assert(inventory.totalOriginalProbes === 319, "legacy totalOriginalProbes must be 319");
  const ids = new Set();
  const inputs = [];
  const records = inventory.probes.map((record, index) => {
    assert(typeof record.originalProbeId === "string" && record.originalProbeId.length > 0, `legacy row ${index + 1} lacks originalProbeId`);
    assert(!ids.has(record.originalProbeId), `duplicate legacy originalProbeId: ${record.originalProbeId}`);
    ids.add(record.originalProbeId);
    assert(typeof record.exactQuestion === "string" && record.exactQuestion.length > 0, `legacy row lacks exactQuestion: ${record.originalProbeId}`);
    const evidencePath = legacyPayloadPath(record);
    const locked = lockTrackedInput(evidencePath);
    const schema = validateLegacyPayload(readJson(evidencePath).value, evidencePath);
    assert(normalizeText(record.exactQuestion) === normalizeText(schema.prompt), `legacy prompt mismatch: ${record.originalProbeId}`);
    inputs.push(locked);
    return {
      canonicalRecordKey: `LEGACY_R9::${record.originalProbeId}`,
      recordKind: "LEGACY_R9_HISTORIC_RECORD",
      inventoryOrdinal: index + 1,
      historicOriginalProbeId: record.originalProbeId,
      historicIdClaimed: true,
      originatingTask: record.originatingTask,
      exactQuestion: record.exactQuestion,
      originalSourceRecord: record,
      materialFieldResolutions: legacyMaterialResolutions(record, index),
      evidenceMappings: [{ path: evidencePath, sha256: locked.sha256, bytes: locked.bytes, sourceIdField: schema.idField, sourceId: schema.id, promptField: schema.promptField, exactPrompt: schema.prompt, normalizedQuestionMatch: true }],
    };
  });
  assert(ids.size === 319, "legacy unique ID count mismatch");
  return { records, inputs };
}

function jsonFiles(root) {
  const files = fs.readdirSync(abs(root), { withFileTypes: true });
  assert(files.every((item) => item.isFile()), `closed payload root contains a non-file entry: ${root}`);
  return files.map((item) => item.name).filter((name) => name.endsWith(".json")).sort(compareText);
}

function buildA12Records() {
  const records = [];
  const inputs = [];
  for (const [remediation, root, expectedCount] of A12_ROOTS) {
    const files = jsonFiles(root);
    assert(files.length === expectedCount, `A12 remediation ${remediation} count ${files.length}, expected ${expectedCount}`);
    for (const fileName of files) {
      const evidencePath = `${root}/${fileName}`;
      const locked = lockTrackedInput(evidencePath);
      const payload = validateNativePayload(readJson(evidencePath).value, evidencePath);
      assert(fileName === `${payload.id}.json`, `A12 filename/id mismatch: ${evidencePath}`);
      inputs.push(locked);
      records.push({
        canonicalRecordKey: `A12_NATIVE_OCCURRENCE::R${remediation}::${evidencePath}`,
        occurrenceIdentity: { task: "A12", remediation, artifactRoot: root, path: evidencePath },
        recordKind: "A12_PAYLOAD_NATIVE_SOURCE_OCCURRENCE",
        historicOriginalProbeId: payload.id,
        historicIdClaimed: true,
        sourceNativeId: payload.id,
        exactPrompt: payload.prompt,
        materialFieldResolutions: nativeMaterialResolutions(payload, evidencePath),
        evidenceMappings: [{ path: evidencePath, sha256: locked.sha256, bytes: locked.bytes, sourceId: payload.id, promptField: "prompt", exactPrompt: payload.prompt }],
      });
    }
  }
  assert(records.length === 278, `A12 occurrence count ${records.length}, expected 278`);
  assert(new Set(records.map((row) => row.canonicalRecordKey)).size === 278, "A12 occurrence keys are not unique");
  return { records, inputs };
}

function buildA13Records() {
  const files = jsonFiles(A13_ROOT);
  assert(files.length === 150, `A13 physical mapping count ${files.length}, expected 150`);
  const grouped = new Map();
  const inputs = [];
  for (const fileName of files) {
    const match = /^Q([1-9]|[1-4][0-9]|50)-r([123])\.json$/u.exec(fileName);
    assert(match, `A13 filename is not an exact Q1..Q50 round slot: ${fileName}`);
    const evidencePath = `${A13_ROOT}/${fileName}`;
    const locked = lockTrackedInput(evidencePath);
    const payload = validateNativePayload(readJson(evidencePath).value, evidencePath);
    const originalId = `Q${Number(match[1])}`;
    assert(payload.id === originalId, `A13 payload.id mismatch: ${evidencePath}`);
    inputs.push(locked);
    const entry = grouped.get(originalId) ?? { prompt: payload.prompt, mappings: [] };
    assert(entry.prompt === payload.prompt, `A13 round prompt mismatch for ${originalId}`);
    entry.mappings.push({ executionSlot: fileName.slice(0, -5), executionSlotIsNotOriginalId: true, path: evidencePath, sha256: locked.sha256, bytes: locked.bytes, sourceId: payload.id, promptField: "prompt", exactPrompt: payload.prompt });
    grouped.set(originalId, entry);
  }
  const records = [];
  for (let number = 1; number <= 50; number += 1) {
    const originalId = `Q${number}`;
    const entry = grouped.get(originalId);
    assert(entry && entry.mappings.length === 3, `A13 ${originalId} must have exactly 3 mappings`);
    assert(new Set(entry.mappings.map((item) => item.executionSlot)).size === 3, `A13 ${originalId} round slots are not unique`);
    const representative = readJson(entry.mappings[0].path).value;
    records.push({ canonicalRecordKey: `A13_NATIVE_ORIGINAL::${originalId}`, recordKind: "A13_PAYLOAD_NATIVE_ORIGINAL", historicOriginalProbeId: originalId, historicIdClaimed: true, sourceNativeId: originalId, filenameRoundSlotsCreateOriginalIds: false, exactPrompt: entry.prompt, materialFieldResolutions: nativeMaterialResolutions(representative, entry.mappings[0].path), evidenceMappings: entry.mappings });
  }
  assert(records.length === 50 && [...grouped.keys()].length === 50, "A13 original ID count mismatch");
  return { records, inputs };
}

function buildA13R1Records() {
  const files = jsonFiles(A13_R1_ROOT);
  assert(files.length === 23, `A13-R1 count ${files.length}, expected 23`);
  const ids = new Set();
  const inputs = [];
  const records = files.map((fileName) => {
    const evidencePath = `${A13_R1_ROOT}/${fileName}`;
    const locked = lockTrackedInput(evidencePath);
    const payload = validateNativePayload(readJson(evidencePath).value, evidencePath);
    assert(fileName === `${payload.id}.json`, `A13-R1 filename/id mismatch: ${evidencePath}`);
    assert(!ids.has(payload.id), `duplicate A13-R1 native id: ${payload.id}`);
    ids.add(payload.id);
    inputs.push(locked);
    return { canonicalRecordKey: `A13_R1_NATIVE::${payload.id}`, recordKind: "A13_R1_PAYLOAD_NATIVE_RECORD", historicOriginalProbeId: payload.id, historicIdClaimed: true, sourceNativeId: payload.id, exactPrompt: payload.prompt, materialFieldResolutions: nativeMaterialResolutions(payload, evidencePath), evidenceMappings: [{ path: evidencePath, sha256: locked.sha256, bytes: locked.bytes, sourceId: payload.id, promptField: "prompt", exactPrompt: payload.prompt }] };
  });
  assert(ids.size === 23, "A13-R1 native IDs are not unique");
  return { records, inputs };
}

function importSpecifiers(source) {
  const found = [];
  const pattern = /(?:\b(?:import|export)\s+(?:[^"']*?\s+from\s*)?|\bimport\s*\()\s*["']([^"']+)["']/gmu;
  for (const match of source.matchAll(pattern)) found.push(match[1]);
  return found;
}

function resolveRelativeImport(importer, specifier) {
  const base = toPosix(path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier)));
  assert(!base.startsWith("../") && base !== "..", `relative import escapes repository: ${importer} -> ${specifier}`);
  const candidates = path.posix.extname(base) ? [base] : [base, `${base}.js`, `${base}.mjs`, `${base}.cjs`, `${base}/index.js`, `${base}/index.mjs`];
  const matches = candidates.filter((candidate) => fs.existsSync(abs(candidate)) && fs.statSync(abs(candidate)).isFile());
  assert(matches.length === 1, `unresolved or ambiguous relative import: ${importer} -> ${specifier}`);
  return matches[0];
}

function isNodeBuiltinSpecifier(specifier) {
  return specifier.startsWith("node:") || NODE_BUILTINS.has(specifier);
}

function packageNameFromSpecifier(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function lockTestDependencyClosure() {
  const queue = TEST_SPECS.map(([testPath]) => testPath);
  const visited = new Set();
  const inputs = [];
  const edges = [];
  const skipped = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const locked = lockTrackedInput(current);
    inputs.push(locked);
    const source = fs.readFileSync(abs(current), "utf8");
    for (const specifier of importSpecifiers(source)) {
      if (specifier.startsWith(".")) {
        const resolved = resolveRelativeImport(current, specifier);
        edges.push({ importer: current, specifier, resolved, classification: "RELATIVE_LOCAL_ESM_LOCKED" });
        queue.push(resolved);
      } else {
        skipped.push({
          importer: current,
          specifier,
          classification: isNodeBuiltinSpecifier(specifier)
            ? "NODE_BUILTIN_RECORDED_NOT_LOCAL"
            : "NONBUILTIN_BARE_PACKAGE_IMPORT_REQUIRES_PACKAGE_IDENTITY_ASSERTION",
        });
      }
    }
  }
  return { inputs, edges: edges.sort((a, b) => compareText(`${a.importer}:${a.specifier}`, `${b.importer}:${b.specifier}`)), skipped: skipped.sort((a, b) => compareText(`${a.importer}:${a.specifier}`, `${b.importer}:${b.specifier}`)) };
}

function buildPackageIdentityAssertions(nonlocalImports, packageLock) {
  assert(packageLock && typeof packageLock === "object", "package-lock.json must be an object");
  assert(packageLock.packages && typeof packageLock.packages === "object", "package-lock.json packages map is required");
  const nodeModulesRoot = fs.realpathSync(abs("node_modules"));
  const packageImports = nonlocalImports.filter((item) => item.classification.startsWith("NONBUILTIN"));
  const grouped = new Map();
  for (const item of packageImports) {
    const packageName = packageNameFromSpecifier(item.specifier);
    const entry = grouped.get(packageName) ?? { importedSpecifiers: new Set(), importers: new Set() };
    entry.importedSpecifiers.add(item.specifier);
    entry.importers.add(item.importer);
    grouped.set(packageName, entry);
  }
  const identities = [];
  const inputs = [];
  for (const packageName of [...grouped.keys()].sort(compareText)) {
    const usage = grouped.get(packageName);
    const resolvedEntrypoints = [...usage.importedSpecifiers].sort(compareText).map((specifier) => {
      let resolved;
      try {
        resolved = fs.realpathSync(WORKSPACE_REQUIRE.resolve(specifier));
      } catch (error) {
        fail(`cannot resolve bare package import ${specifier} from workspace: ${error.message}`);
      }
      const relative = path.relative(nodeModulesRoot, resolved);
      assert(relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative), `bare import resolves outside workspace node_modules: ${specifier}`);
      return { specifier, resolvedEntrypoint: toPosix(resolved) };
    });
    let searchDirectory = path.dirname(resolvedEntrypoints[0].resolvedEntrypoint);
    let resolvedPath = null;
    while (true) {
      const relative = path.relative(nodeModulesRoot, searchDirectory);
      assert(relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)), `package manifest search escaped workspace node_modules: ${packageName}`);
      const candidate = path.join(searchDirectory, "package.json");
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const candidateValue = JSON.parse(fs.readFileSync(candidate, "utf8"));
        if (candidateValue.name === packageName) {
          resolvedPath = fs.realpathSync(candidate);
          break;
        }
      }
      assert(searchDirectory !== nodeModulesRoot, `cannot find owning package.json for ${packageName}`);
      searchDirectory = path.dirname(searchDirectory);
    }
    for (const entrypoint of resolvedEntrypoints) {
      const relativeToPackage = path.relative(path.dirname(resolvedPath), entrypoint.resolvedEntrypoint);
      assert(!relativeToPackage.startsWith("..") && !path.isAbsolute(relativeToPackage), `specifier resolves outside owning package: ${entrypoint.specifier}`);
    }
    const relativeToNodeModules = path.relative(nodeModulesRoot, resolvedPath);
    assert(
      relativeToNodeModules !== "" && !relativeToNodeModules.startsWith("..") && !path.isAbsolute(relativeToNodeModules),
      `package manifest resolves outside workspace node_modules: ${packageName}`,
    );
    const declaredPath = toPosix(path.relative(ROOT, resolvedPath));
    const bytes = fs.readFileSync(resolvedPath);
    let manifest;
    try {
      manifest = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      fail(`invalid workspace package manifest ${declaredPath}: ${error.message}`);
    }
    assert(manifest.name === packageName, `package manifest name mismatch for ${packageName}`);
    assert(typeof manifest.version === "string" && manifest.version.length > 0, `package version missing for ${packageName}`);
    const lockKey = toPosix(path.dirname(declaredPath));
    const lockEntry = packageLock.packages[lockKey];
    assert(lockEntry && typeof lockEntry === "object", `package lock entry missing: ${lockKey}`);
    assert(lockEntry.version === manifest.version, `package/lock version mismatch for ${packageName}`);
    assert(typeof lockEntry.integrity === "string" && lockEntry.integrity.length > 0, `lock integrity missing for ${packageName}`);
    const input = { path: declaredPath, sha256: sha256(bytes), bytes: bytes.length, inputKind: "WORKSPACE_NODE_MODULES_PACKAGE_MANIFEST", trackedAtStartingHead: false };
    inputs.push(input);
    identities.push({
      packageName,
      importedSpecifiers: [...usage.importedSpecifiers].sort(compareText),
      importers: [...usage.importers].sort(compareText),
      resolvedEntrypoints,
      packageJsonPath: declaredPath,
      packageJsonRealPath: toPosix(resolvedPath),
      packageJsonSha256: input.sha256,
      packageJsonBytes: input.bytes,
      installedVersion: manifest.version,
      lockfilePath: PACKAGE_LOCK_PATH,
      lockfilePackageKey: lockKey,
      lockfileVersion: lockEntry.version,
      lockfileIntegrity: lockEntry.integrity,
      installedPackageJsonNameAndVersionMatchLockfile: true,
      lockfileIntegrityPresentAndRecorded: true,
      lockfileIntegrityVerifiedAgainstInstalledPackageBytes: false,
      assertionScope: "DIRECT_IMPORTED_INSTALLED_PACKAGE_JSON_NAME_AND_VERSION_MATCH_LOCKFILE_VERSION; LOCKFILE_INTEGRITY_IS_PRESENT_AND_RECORDED_BUT_NOT_VERIFIED_AGAINST_INSTALLED_PACKAGE_BYTES; NOT_A_FULL_TRANSITIVE_PACKAGE_CODE_HASH",
      pass: true,
    });
  }
  return {
    builtinImports: nonlocalImports.filter((item) => item.classification === "NODE_BUILTIN_RECORDED_NOT_LOCAL"),
    packageImports,
    identities,
    inputs,
  };
}

function assertNoSecretLikeText(text, label) {
  const patterns = [
    /\bsk-[A-Za-z0-9_-]{16,}\b/u,
    /\b(?:api[_-]?key|authorization|bearer)\s*[:=]\s*[^\s]{8,}/iu,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  ];
  assert(!patterns.some((pattern) => pattern.test(text)), `secret-like text detected in ${label}`);
}

function r9BlobFor(testPath) {
  const result = run("git", ["rev-parse", `${R9_FINAL_COMMIT}:${testPath}`]);
  assert(result.status === 0, `canonical test absent at R9 final commit: ${testPath}`);
  return result.stdout.trim();
}

function executeTests() {
  const executions = [];
  const canonicalRecords = [];
  const supplementalRecords = [];
  for (const [testPath, expectedCases, classification] of TEST_SPECS) {
    const source = lockTrackedInput(testPath);
    let r9FinalGitBlobOid = null;
    if (classification === "R9_CANONICAL") {
      r9FinalGitBlobOid = r9BlobFor(testPath);
      assert(r9FinalGitBlobOid === source.headGitBlobOid, `canonical test HEAD blob differs from R9 final blob: ${testPath}`);
    }
    const result = runIsolatedTest(testPath);
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    const combined = `${stdout}${stderr}`;
    assertNoSecretLikeText(combined, testPath);
    assert(result.status === 0 && result.signal === null, `${testPath} failed with exit ${result.status}, signal ${result.signal}: ${stderr.trim()}`);
    const labels = [...stdout.matchAll(/^PASS (.+)$/gmu)].map((match) => match[1]);
    const summaries = [...stdout.matchAll(/(?:^|\n)(?:[^\n]*?:\s*)?(\d+) passed,\s*(\d+) failed(?:,\s*(\d+) assertions)?(?:\r?\n|$)/gmu)];
    assert(summaries.length === 1, `${testPath} emitted ${summaries.length} summaries`);
    const passed = Number(summaries[0][1]);
    const failed = Number(summaries[0][2]);
    const assertions = summaries[0][3] === undefined ? "NOT_REPORTED" : Number(summaries[0][3]);
    assert(failed === 0 && passed === labels.length && labels.length === expectedCases, `${testPath} case accounting mismatch`);
    const outputSha256 = sha256(Buffer.from(combined, "utf8"));
    executions.push({ command: `node --import <embedded-e2-isolation-guard> ${testPath}`, classification, source, isolation: { childEnvironment: "SCRUBBED_FIXED_ALLOWLIST_WITHOUT_PARENT_ENVIRONMENT_INHERITANCE", allowedEnvironmentKeys: ["NODE_ENV", "TZ", "DOTENV_CONFIG_PATH", "DOTENV_CONFIG_QUIET", "OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"], credentialValues: "INERT_NONSECRET_PLACEHOLDERS_NOT_PERSISTED_OR_PRINTED", dotenvSentinelPath: DOTENV_SENTINEL, dotenvSentinelConfirmedAbsent: true, preloadGuardSha256: sha256(Buffer.from(TEST_PRELOAD_GUARD_SOURCE, "utf8")), enforcedBlockedSurfaces: ["global fetch", "node:http request/get", "node:https request/get", "node:net connect/createConnection", "node:tls connect", "node:dns callback and promise lookup/resolve families", "node:fs .env read/open/read-stream surfaces"], guaranteeScope: "IN_PROCESS_PRELOAD_MONKEYPATCH_OF_LISTED_NODE_SURFACES; NOT A GENERAL OS SANDBOX" }, r9FinalCommit: classification === "R9_CANONICAL" ? R9_FINAL_COMMIT : "NOT_APPLICABLE", r9FinalGitBlobOid: r9FinalGitBlobOid ?? "NOT_APPLICABLE", exitCode: result.status, signal: "NONE", passed, failed, assertions, stdoutSha256: sha256(Buffer.from(stdout, "utf8")), stderrSha256: sha256(Buffer.from(stderr, "utf8")), combinedOutputSha256: outputSha256, stdout, stderr });
    labels.forEach((literalPassLabel, index) => {
      const sourceCaseIdentity = { path: testPath, ordinal: index + 1, literalLabel: literalPassLabel };
      const record = {
        canonicalRecordKey: `DERIVED_SOURCE_CASE::${testPath}#${index + 1}`,
        canonicalKeyKind: "DERIVED_NOT_HISTORIC",
        recordKind: classification === "R9_CANONICAL" ? "SOURCE_CASE_AT_R9_SNAPSHOT" : "SUPPLEMENTAL_CURRENT_VERIFICATION_CASE",
        sourceCaseIdentity,
        historicOriginalProbeId: null,
        historicIdClaimed: false,
        inputBindingState: "SOURCE_CASE_MAY_ENCODE_MULTIPLE_INPUTS",
        exactQuestionClaimed: false,
        materialFieldResolutions: testMaterialResolutions(testPath),
        evidenceMappings: [{ path: testPath, sourceSha256: source.sha256, sourceBytes: source.bytes, sourceHeadGitBlobOid: source.headGitBlobOid, r9FinalGitBlobOid: r9FinalGitBlobOid ?? "NOT_APPLICABLE", executionOutputSha256: outputSha256, ordinal: index + 1, literalPassLabel }],
      };
      (classification === "R9_CANONICAL" ? canonicalRecords : supplementalRecords).push(record);
    });
  }
  assert(canonicalRecords.length === 184, `R9 snapshot derived case count ${canonicalRecords.length}, expected 184`);
  assert(supplementalRecords.length === 84, `supplemental case count ${supplementalRecords.length}, expected 84`);
  return { executions, canonicalRecords, supplementalRecords };
}

function compactExecution(execution) {
  const { stdout, stderr, ...compact } = execution;
  return compact;
}

function commandLog(executions) {
  return executions.map((item) => [
    `COMMAND ${item.command}`,
    `CLASSIFICATION ${item.classification}`,
    `EXIT ${item.exitCode}`,
    `SOURCE_SHA256 ${item.source.sha256}`,
    `SOURCE_HEAD_BLOB ${item.source.headGitBlobOid}`,
    `R9_FINAL_BLOB ${item.r9FinalGitBlobOid}`,
    `STDOUT_SHA256 ${item.stdoutSha256}`,
    `STDERR_SHA256 ${item.stderrSha256}`,
    `COMBINED_OUTPUT_SHA256 ${item.combinedOutputSha256}`,
    "STDOUT_BEGIN", item.stdout.replace(/\s+$/u, ""), "STDOUT_END",
    "STDERR_BEGIN", item.stderr.replace(/\s+$/u, ""), "STDERR_END",
  ].join("\n")).join("\n\n").concat("\n");
}

function aggregateInputHash(inputs) {
  const unique = new Map();
  for (const input of inputs) unique.set(input.path, input);
  const ordered = [...unique.values()].sort((a, b) => compareText(a.path, b.path));
  const text = ordered.map((input) => `${input.sha256}  ${input.path}`).join("\n").concat("\n");
  return { count: ordered.length, sha256: sha256(Buffer.from(text, "utf8")), records: ordered };
}

function buildPredecessorDisclosure() {
  assert(fs.existsSync(abs(PREDECESSOR_RUNNER)), "predecessor v1 runner is missing");
  assert(fs.existsSync(abs(PREDECESSOR_OUTPUT)) && fs.statSync(abs(PREDECESSOR_OUTPUT)).isDirectory(), "predecessor v1 output is missing");
  const runnerRawIdentity = rawPathIdentity(PREDECESSOR_RUNNER, "PRESERVED_UNTRACKED_PREDECESSOR_RUNNER_RAW_BYTES");
  const manifestPath = `${PREDECESSOR_OUTPUT}/E2_EVIDENCE_MANIFEST.sha256`;
  const manifestRawIdentity = rawPathIdentity(manifestPath, "PRESERVED_PREDECESSOR_SELF_EXCLUDED_MANIFEST_RAW_BYTES");
  assert(manifestRawIdentity.sha256 === PREDECESSOR_MANIFEST_SHA256, "predecessor v1 manifest raw SHA-256 mismatch");
  const expectedFileNames = [...DATA_FILES, MANIFEST_FILE].sort(compareText);
  const directoryEntries = fs.readdirSync(abs(PREDECESSOR_OUTPUT), { withFileTypes: true });
  assert(directoryEntries.every((entry) => entry.isFile()), "predecessor output contains a non-file entry");
  const actualFileNames = directoryEntries.map((entry) => entry.name).sort(compareText);
  assert(
    JSON.stringify(actualFileNames) === JSON.stringify(expectedFileNames),
    `predecessor output file set mismatch: ${JSON.stringify(actualFileNames)}`,
  );
  const coveredDataFiles = DATA_FILES.map((fileName) =>
    rawPathIdentity(
      `${PREDECESSOR_OUTPUT}/${fileName}`,
      "PRESERVED_PREDECESSOR_MANIFEST_COVERED_DATA_FILE_RAW_BYTES",
    ),
  ).sort((left, right) => compareText(left.path, right.path));
  const expectedManifestText = coveredDataFiles
    .map((item) => `${item.sha256}  ${item.path}`)
    .join("\n")
    .concat("\n");
  const actualManifestText = fs.readFileSync(abs(manifestPath), "utf8");
  assert(actualManifestText === expectedManifestText, "predecessor self-excluded manifest content is not exact");
  const manifestLines = actualManifestText.trimEnd().split("\n");
  assert(manifestLines.length === 4, "predecessor manifest must contain exactly four data-file entries");
  assert(!manifestLines.some((line) => line.endsWith(`/${MANIFEST_FILE}`)), "predecessor manifest must self-exclude");
  const directoryFiles = [...coveredDataFiles, manifestRawIdentity].sort((left, right) => compareText(left.path, right.path));
  const directoryIdentityText = directoryFiles
    .map((item) => `${item.sha256}  ${item.path}`)
    .join("\n")
    .concat("\n");
  const directoryIdentity = {
    identityScope: "EXACT_ALLOWLISTED_FIVE_FILE_PREDECESSOR_OUTPUT_DIRECTORY_RAW_BYTE_IDENTITY",
    fileCount: directoryFiles.length,
    sha256: sha256(Buffer.from(directoryIdentityText, "utf8")),
    files: directoryFiles,
    manifestCoveredDataFileCount: coveredDataFiles.length,
    manifestEntryCount: manifestLines.length,
    manifestSelfExcluded: true,
    exactAllowlistedContents: true,
    pass: true,
  };
  assert(directoryIdentity.fileCount === 5, "predecessor directory identity must cover five files");
  return {
    runnerPath: PREDECESSOR_RUNNER,
    outputPath: PREDECESSOR_OUTPUT,
    runnerExists: true,
    outputExists: true,
    disposition: "INTERNAL_REVIEW_REJECTED_NONTERMINAL_CHANGES_REQUESTED",
    terminalPassClaimedOrInherited: false,
    modifiedByRevision2: false,
    runnerRawIdentity,
    selfExcludedManifest: {
      path: manifestPath,
      expectedRawSha256: PREDECESSOR_MANIFEST_SHA256,
      actualRawSha256: manifestRawIdentity.sha256,
      bytes: manifestRawIdentity.bytes,
      exactContentValidated: true,
    },
    directoryIdentity,
  };
}

function verifyPostTestIntegrity({ governedInputs, preDirtyPaths, preProtectedFiles, preRunner, prePredecessor }) {
  const unique = new Map();
  for (const input of governedInputs) unique.set(input.path, input);
  const records = [...unique.values()].sort((a, b) => compareText(a.path, b.path)).map((input) => {
    const bytes = fs.readFileSync(abs(input.path));
    const postSha256 = sha256(bytes);
    assert(postSha256 === input.sha256 && bytes.length === input.bytes, `governed input changed during tests: ${input.path}`);
    if (input.headGitBlobOid) lockTrackedInput(input.path);
    return { path: input.path, preSha256: input.sha256, postSha256, preBytes: input.bytes, postBytes: bytes.length, pass: true };
  });
  const postDirtyPaths = currentTrackedDirtyPaths();
  assert(JSON.stringify(postDirtyPaths) === JSON.stringify(preDirtyPaths), "tracked dirty-path set changed during tests");
  const postProtectedFiles = verifyProtectedFiles();
  assert(JSON.stringify(postProtectedFiles) === JSON.stringify(preProtectedFiles), "protected file state changed during tests");
  const postRunner = rawRunnerIdentity();
  assert(postRunner.sha256 === preRunner.sha256 && postRunner.bytes === preRunner.bytes, "revision-2 runner changed during tests");
  const postPredecessor = buildPredecessorDisclosure();
  assert(postPredecessor.runnerRawIdentity.sha256 === prePredecessor.runnerRawIdentity.sha256, "predecessor runner changed during tests");
  assert(
    postPredecessor.directoryIdentity.sha256 === prePredecessor.directoryIdentity.sha256 &&
      JSON.stringify(postPredecessor.directoryIdentity.files) === JSON.stringify(prePredecessor.directoryIdentity.files),
    "predecessor five-file directory identity changed during tests",
  );
  const postAggregate = aggregateInputHash(records.map((item) => ({ path: item.path, sha256: item.postSha256, bytes: item.postBytes })));
  const preAggregate = aggregateInputHash([...unique.values()]);
  assert(postAggregate.sha256 === preAggregate.sha256 && postAggregate.count === preAggregate.count, "governed input aggregate changed during tests");
  return {
    trackedDirtyPathSet: { pre: preDirtyPaths, post: postDirtyPaths, equal: true },
    protectedFiles: { pre: preProtectedFiles, post: postProtectedFiles, equal: true },
    governedInputRawBytes: { count: records.length, preAggregateSha256: preAggregate.sha256, postAggregateSha256: postAggregate.sha256, mismatchCount: 0, records },
    runnerRawBytes: { pre: preRunner, post: postRunner, equal: true },
    predecessorIntegrity: { pre: prePredecessor, post: postPredecessor, equal: true },
    pass: true,
  };
}

function assertRecordInvariants(records) {
  assert(records.length === 854, `canonical closure record count ${records.length}, expected 854`);
  assert(new Set(records.map((row) => row.canonicalRecordKey)).size === 854, "canonical record keys are not unique");
  const mappings = records.reduce((sum, row) => sum + row.evidenceMappings.length, 0);
  assert(mappings === 954, `exact evidence mapping count ${mappings}, expected 954`);
  for (const row of records) {
    assert(row.evidenceMappings.length > 0, `record is not evidence-bound: ${row.canonicalRecordKey}`);
    assert(Object.keys(row.materialFieldResolutions).length === MATERIAL_FIELDS.length, `material resolution schema mismatch: ${row.canonicalRecordKey}`);
    for (const field of MATERIAL_FIELDS) {
      const item = row.materialFieldResolutions[field];
      assert(item && item.state && item.value !== null && item.value !== undefined && item.evidencePath && item.justification, `unresolved material field ${field}: ${row.canonicalRecordKey}`);
    }
  }
  const derived = records.filter((row) => row.canonicalKeyKind === "DERIVED_NOT_HISTORIC");
  assert(derived.length === 184, "derived canonical case count mismatch");
  assert(derived.every((row) => row.historicOriginalProbeId === null && row.historicIdClaimed === false), "derived key misclassified as historic");
  return mappings;
}

function buildArtifacts() {
  const preDirtyPaths = currentTrackedDirtyPaths();
  const protectedFiles = verifyProtectedFiles();
  const runner = rawRunnerIdentity();
  const predecessor = buildPredecessorDisclosure();
  const packageRootInputs = [lockTrackedInput(PACKAGE_JSON_PATH), lockTrackedInput(PACKAGE_LOCK_PATH)];
  const packageLock = readJson(PACKAGE_LOCK_PATH).value;
  const semanticInputs = CONTROLLING_SOURCES.map(lockTrackedInput);
  const prerequisiteEvidence = PREREQUISITES.map(([claim, evidencePath]) => ({ claim, classification: "PREREQUISITE_CLAIM_RECORDED_NOT_READJUDICATED_BY_E2", evidence: lockTrackedInput(evidencePath) }));
  const inventory = readJson(INVENTORY_PATH).value;
  const legacy = buildLegacyRecords(inventory);
  const a12 = buildA12Records();
  const a13 = buildA13Records();
  const a13r1 = buildA13R1Records();
  const dependencyClosure = lockTestDependencyClosure();
  const packageIdentity = buildPackageIdentityAssertions(dependencyClosure.skipped, packageLock);
  const governedInputs = [
    ...packageRootInputs,
    ...semanticInputs,
    ...prerequisiteEvidence.map((item) => item.evidence),
    ...legacy.inputs,
    ...a12.inputs,
    ...a13.inputs,
    ...a13r1.inputs,
    ...dependencyClosure.inputs,
    ...packageIdentity.inputs,
  ];
  const inputSet = aggregateInputHash(governedInputs);
  const tests = executeTests();
  const postTestIntegrity = verifyPostTestIntegrity({
    governedInputs,
    preDirtyPaths,
    preProtectedFiles: protectedFiles,
    preRunner: runner,
    prePredecessor: predecessor,
  });
  const canonicalRecords = [...legacy.records, ...a12.records, ...a13.records, ...a13r1.records, ...tests.canonicalRecords];
  const exactEvidenceMappingCount = assertRecordInvariants(canonicalRecords);
  const explicitHistoricOrNativeRecordCount = legacy.records.length + a12.records.length + a13.records.length + a13r1.records.length;
  assert(explicitHistoricOrNativeRecordCount === 670, "explicit historic/native count mismatch");
  const counts = {
    legacyR9RecordCount: 319,
    a12PayloadNativeOccurrenceCount: 278,
    a13OriginalIdCount: 50,
    a13PhysicalMappingCount: 150,
    a13R1NativeRecordCount: 23,
    r9SnapshotDerivedTestCaseCount: 184,
    supplementalCurrentVerificationCaseCount: 84,
    explicitHistoricOrNativeRecordCount,
    canonicalClosureRecordCount: canonicalRecords.length,
    exactEvidenceMappingCount,
    uniqueCanonicalRecordKeyCount: new Set(canonicalRecords.map((row) => row.canonicalRecordKey)).size,
    derivedKeysMisclassifiedAsHistoric: 0,
    unresolvedMaterialFieldCount: 0,
    inventedSemanticResolutionCount: 0,
  };

  const contract = {
    identity: IDENTITY,
    purpose: "Repair the reviewer-found E2 inventory gap under direct owner authority by closing the exact historic/native plus R9-snapshot-derived canonical evidence inventory without inventing legal semantics.",
    scopeAndSemantics: {
      legacy319: "Preserved from the R9 inventory with exact question, original mapping fields, and typed material-field resolutions.",
      a12: "All 278 task/artifact/path-scoped payload-native occurrences under six exact closed roots; bare IDs are not deduplicated.",
      a13: "Fifty original IDs Q1..Q50, each mapped to three physical round slots; filename Qn-rm is an execution slot and never a new original ID.",
      a13R1: "Twenty-three native payload IDs and physical mappings.",
      r9PreservedTestCases: "184 source-defined path+ordinal+literal-label cases at the R9 snapshot. Keys are explicitly derived; no historic original ID or one-input exact-question claim is made.",
      supplemental: "A14-R1..R3 produce 84 current verification cases outside canonical inventory.",
      evidenceMappingName: "E2 exact evidence mapping; no absent E1 mapping is claimed.",
    },
    inputsAndPrerequisites: {
      startingHead: { branch: EXPECTED_BRANCH, commit: EXPECTED_HEAD },
      r9FinalCommit: R9_FINAL_COMMIT,
      nodeRuntimeIdentity: runtimeIdentity(),
      packageRootInputs,
      packageIdentityAssertionScope: "DIRECT_IMPORTED_INSTALLED_PACKAGE_JSON_NAME_AND_VERSION_MATCH_LOCKFILE_VERSION; LOCKFILE_INTEGRITY_IS_PRESENT_AND_RECORDED_BUT_NOT_VERIFIED_AGAINST_INSTALLED_PACKAGE_BYTES; NOT_A_FULL_TRANSITIVE_PACKAGE_CODE_HASH",
      packageIdentity,
      semanticInputs,
      prerequisiteEvidence,
      inputSet,
      runnerRawIdentity: runner,
      testDependencyClosure: { recursivelyLockedLocalFiles: dependencyClosure.inputs, relativeImportEdges: dependencyClosure.edges, recordedNonlocalImports: dependencyClosure.skipped, unresolvedRelativeSpecifiers: 0 },
    },
    ownerGovernedBehavior: {
      directOwnerRepairAuthority: true,
      outputOnlyAtExactAllowlistedDirectory: OUTPUT_DIR,
      overwriteAllowed: false,
      networkAllowed: false,
      childTestIsolation: "Each test child receives a fixed seven-key environment rather than inherited parent values; DOTENV_CONFIG_PATH targets an asserted-absent controlled sentinel; an embedded data: ESM preload guard fail-closes global fetch, listed Node network/DNS surfaces, and listed node:fs .env read/open surfaces.",
      isolationScopeLimitation: "The preload guard is an in-process monkeypatch of enumerated Node APIs, not a general operating-system sandbox or a full audit of every possible native/addon side channel.",
    },
    allowedPaths: [RUNNER_PATH, `${OUTPUT_DIR}/**`],
    prohibitedPaths: [...Object.keys(PROTECTED), "knowledge/CURRENT_STATE.md", "B2-B6 artifacts", PREDECESSOR_RUNNER, `${PREDECESSOR_OUTPUT}/**`, "all production/runtime/oracle/validator/test/source inputs"],
    commands: { verifyOnly: `node ${RUNNER_PATH} --verify-only`, output: `node ${RUNNER_PATH} --out ${OUTPUT_DIR}`, verifyEvidence: `node ${RUNNER_PATH} --verify-evidence`, focusedTests: TEST_SPECS.map(([testPath]) => `node --import <embedded-e2-isolation-guard> ${testPath}`) },
    expectedOutputs: [...DATA_FILES, MANIFEST_FILE],
    passCriteria: ["exact branch/HEAD, reviewed Node runtime identity, and zero staged paths", "package.json and package-lock.json are HEAD-locked; each directly imported nonbuilt-in installed package.json remains inside workspace node_modules and its name/version match the lockfile version; lockfile integrity is required and recorded but is not verified against installed package bytes", "all tracked inputs and recursively reachable relative local ESM dependencies equal starting HEAD after Git filters", "all ten canonical test entry blobs equal their R9-final blobs", "counts and uniqueness equal the exact acceptance algebra", "every record is individually evidence-bound and every material field has a typed resolution", "all 13 focused tests pass exact case accounting under the scrubbed environment and embedded no-network/no-.env preload guard", "post-test tracked dirty paths, protected bytes, governed inputs, runner, and the complete five-file predecessor directory identity equal their pretest state", "protected byte hashes pass and all generated persisted text passes secret-like scanning", "output is reproducible byte-for-byte and manifest hashes validate"],
    failureCriteria: ["any identity, staging, path, dependency, package/lock identity, runtime, isolation, post-test integrity, hash, JSON schema, id, prompt, count, uniqueness, mapping, material-resolution, R9-blob, test, output, manifest, protected-file, or secret-scan assertion fails"],
    evidence: { fourDeterministicDataFilesPlusSelfExcludedManifest: true, exactEvidenceMappingCount, historicalClaimsReadjudicated: false, postTestIntegrity },
    review: { internalReviewRequired: true, internalReviewStatus: "PENDING", externalReviewRequired: false },
    noExternalRequired: true,
    currentState: { updateAuthorized: false, updated: false },
    gitPublication: { stageCommitPushAuthorized: false, status: "DEFERRED_UNTIL_SEPARATELY_GOVERNED_AFTER_INTERNAL_REVIEW" },
    b2ThroughB6: { disposition: "OPEN_UNCHANGED_OUT_OF_SCOPE", modified: false },
    rollback: "No overwrite is possible. If an interrupted output-mode invocation leaves only the exact new v2 directory, preserve diagnostics and remove only that directory under separately authorized cleanup; no runtime rollback applies.",
    predecessorDisclosure: predecessor,
  };

  const strictInventory = {
    identity: IDENTITY,
    startingHead: EXPECTED_HEAD,
    counts,
    legacyR9Records: legacy.records,
    a12PayloadNativeOccurrenceRecords: a12.records,
    a13PayloadNativeOriginalRecords: a13.records,
    a13R1PayloadNativeRecords: a13r1.records,
    r9PreservedTestCaseRecords: tests.canonicalRecords,
    supplementalCurrentVerificationCases: tests.supplementalRecords,
    limitations: ["The 184 R9-snapshot test cases are derived source-case identities, not historic A12/A13 original IDs.", "A test case may encode multiple inputs; E2 does not invent a single exact question binding.", "No proposition class or expected trust behavior is inferred from prompt, answer, label, or actual trust output.", "Prerequisite claims are recorded from governed artifacts and are not re-adjudicated by E2."],
  };

  const result = {
    identity: IDENTITY,
    status: "PASS",
    pass: true,
    resultCode: "E2_STRICT_CANONICAL_INVENTORY_CLOSURE_2_PASS",
    startingHead: EXPECTED_HEAD,
    runnerRawIdentity: runner,
    inputSet: { count: inputSet.count, sha256: inputSet.sha256 },
    checks: { ...counts, reviewedNodeRuntimeIdentityPass: true, deterministicSuiteCount: 13, deterministicSuitePassedCount: 13, deterministicSuiteFailedCount: 0, canonicalTestSuiteCount: 10, supplementalTestSuiteCount: 3, recursivelyLockedLocalFileCount: dependencyClosure.inputs.length, relativeImportEdgeCount: dependencyClosure.edges.length, unresolvedRelativeImportCount: 0, directImportedPackageIdentityCount: packageIdentity.identities.length, directImportedPackageNameVersionMismatchCount: 0, lockfileIntegrityPresentCount: packageIdentity.identities.length, lockfileIntegrityVerifiedAgainstInstalledPackageBytesCount: 0, builtinImportOccurrenceCount: packageIdentity.builtinImports.length, scrubbedIsolatedTestProcessCount: 13, postTestGovernedInputReverifiedCount: postTestIntegrity.governedInputRawBytes.count, postTestGovernedInputMismatchCount: 0, postTestTrackedDirtyPathSetChanged: false, postTestRunnerChanged: false, postTestPredecessorFiveFileDirectoryChanged: false, predecessorManifestCoveredDataFileCount: predecessor.directoryIdentity.manifestCoveredDataFileCount, predecessorDirectoryIdentityFileCount: predecessor.directoryIdentity.fileCount, protectedFileCount: protectedFiles.length, protectedFileMismatchCount: 0, secretLikeOutputFindingCount: 0 },
    protectedFiles,
    testExecutions: tests.executions.map(compactExecution),
    runtimeAndPackageIdentity: { nodeRuntimeIdentity: runtimeIdentity(), packageRootInputs, packageIdentity },
    postTestIntegrity,
    predecessorDisclosure: predecessor,
    governance: { productionOrRuntimeChanged: false, currentStateUpdated: false, b2ThroughB6Changed: false, existingE2V1Changed: false, existingEvidenceChanged: false, internalReviewRequired: true, publicationDeferred: true },
  };
  return { contract, strictInventory, result, log: commandLog(tests.executions) };
}

function artifactFiles(artifacts) {
  const files = new Map([
    ["E2_EXECUTION_CONTRACT.json", jsonText(artifacts.contract)],
    ["E2_STRICT_CANONICAL_INVENTORY.json", jsonText(artifacts.strictInventory)],
    ["E2_EXECUTION_RESULT.json", jsonText(artifacts.result)],
    ["E2_COMMAND_OUTPUT.log", artifacts.log],
  ]);
  assert([...files.keys()].every((name) => DATA_FILES.includes(name)), "generated file is outside allowlist");
  for (const [name, contents] of files) assertNoSecretLikeText(contents, name);
  const manifest = [...files.entries()].sort(([a], [b]) => compareText(a, b)).map(([name, contents]) => `${sha256(Buffer.from(contents, "utf8"))}  ${OUTPUT_DIR}/${name}`).join("\n").concat("\n");
  assertNoSecretLikeText(manifest, MANIFEST_FILE);
  return { files, manifest };
}

function writeArtifacts(generated) {
  const outputPath = abs(OUTPUT_DIR);
  fs.mkdirSync(outputPath, { recursive: false });
  for (const [name, contents] of generated.files) fs.writeFileSync(path.join(outputPath, name), contents, { encoding: "utf8", flag: "wx" });
  fs.writeFileSync(path.join(outputPath, MANIFEST_FILE), generated.manifest, { encoding: "utf8", flag: "wx" });
}

function verifyEvidence(generated) {
  const actualNames = fs.readdirSync(abs(OUTPUT_DIR)).sort(compareText);
  const expectedNames = [...DATA_FILES, MANIFEST_FILE].sort(compareText);
  assert(JSON.stringify(actualNames) === JSON.stringify(expectedNames), "existing v2 output file set differs from exact allowlist");
  for (const [name, expected] of generated.files) {
    const actual = fs.readFileSync(path.join(abs(OUTPUT_DIR), name), "utf8");
    assert(actual === expected, `byte comparison failed: ${name}`);
    assertNoSecretLikeText(actual, `${OUTPUT_DIR}/${name}`);
  }
  const actualManifest = fs.readFileSync(path.join(abs(OUTPUT_DIR), MANIFEST_FILE), "utf8");
  assert(actualManifest === generated.manifest, "self-excluded manifest byte comparison failed");
  assertNoSecretLikeText(actualManifest, `${OUTPUT_DIR}/${MANIFEST_FILE}`);
  const lines = actualManifest.trimEnd().split("\n");
  assert(lines.length === 4, "manifest must contain exactly four self-excluded entries");
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  (.+)$/u.exec(line);
    assert(match, `invalid manifest line: ${line}`);
    const relativePath = match[2];
    assert(relativePath.startsWith(`${OUTPUT_DIR}/`), `manifest path outside output: ${relativePath}`);
    assert(sha256(fs.readFileSync(abs(relativePath))) === match[1], `manifest hash mismatch: ${relativePath}`);
  }
}

function main() {
  const { mode } = parseArguments(process.argv.slice(2));
  assertPreconditions(mode);
  const artifacts = buildArtifacts();
  const generated = artifactFiles(artifacts);
  if (mode === "OUTPUT") writeArtifacts(generated);
  if (mode === "VERIFY_EVIDENCE") verifyEvidence(generated);
  console.log(jsonText({ identity: IDENTITY, mode, status: artifacts.result.status, resultCode: artifacts.result.resultCode, checks: artifacts.result.checks, inputSet: artifacts.result.inputSet, wroteOutput: mode === "OUTPUT", verifiedExistingEvidence: mode === "VERIFY_EVIDENCE", outputDirectory: mode === "VERIFY_ONLY" ? "NOT_WRITTEN" : OUTPUT_DIR }));
}

try {
  main();
} catch (error) {
  console.error(jsonText({ identity: IDENTITY, status: "FAIL", resultCode: "E2_STRICT_CANONICAL_INVENTORY_CLOSURE_2_FAIL", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}
