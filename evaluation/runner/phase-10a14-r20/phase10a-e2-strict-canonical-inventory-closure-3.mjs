import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { builtinModules, createRequire } from "node:module";

const IDENTITY = "PHASE-10A14-E2-STRICT-CANONICAL-PRIOR-PROBE-INVENTORY-CLOSURE-3";
const EXPECTED_BRANCH = "feature/source-availability-engine-v1";
const EXPECTED_HEAD = "ae01a08b0faffd95ee52096c53d2199270d7dccc";
const R9_FINAL_COMMIT = "c9dbba52e592de5c8e20b36933e08d93dd6cffa1";
const ROOT = process.cwd();
const RUNNER_PATH =
  "evaluation/runner/phase-10a14-r20/phase10a-e2-strict-canonical-inventory-closure-3.mjs";
const OUTPUT_DIR =
  "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3";
const INVENTORY_PATH = "evaluation/results/phase-10a14-r9/CANONICAL_A12_R8_INVENTORY.json";
const PREDECESSOR_RUNNER =
  "evaluation/runner/phase-10a14-r20/phase10a-e2-strict-canonical-inventory-closure.mjs";
const PREDECESSOR_OUTPUT =
  "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_1";
const PREDECESSOR_MANIFEST_SHA256 =
  "a90187ab695d7a4520da4461d2b9b64c1173dfbaaf8bbea94c15e45d49d8985d";
const V2_RUNNER_PATH =
  "evaluation/runner/phase-10a14-r20/phase10a-e2-strict-canonical-inventory-closure-2.mjs";
const V2_RUNNER_SHA256 =
  "00ed5c0c38844050d7c0f67a80f315c64167987cf08ae9bb935548fc8bda6207";
const V2_OUTPUT_DIR =
  "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_2";
const V2_MANIFEST_SHA256 =
  "330344e74751d787648fbb014e2bbf04c47c5df987d3b63f6de02d5c5e8e5d2e";
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
    assert(!fs.existsSync(outputPath), `refusing to overwrite existing v3 output: ${OUTPUT_DIR}`);
    assert(fs.statSync(path.dirname(outputPath)).isDirectory(), "output parent is missing");
  } else if (mode === "VERIFY_EVIDENCE") {
    assert(fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory(), `v3 output does not exist: ${OUTPUT_DIR}`);
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
  assert(!headBlobOids.has(RUNNER_PATH), "revision-3 runner unexpectedly exists in starting HEAD");
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

const DB_IDENTITY_TEST_PATH =
  "tests/phase-10a14-r4-sec51-filing-authority-bridge.test.mjs";
const DB_IDENTITY_RAW_PATTERN = /\[DB IDENTITY\] \{\r?\n  supabaseUrlHost: 'e2-isolation\.invalid',\r?\n  supabaseProjectRef: 'e2-isolation',\r?\n  VECTOR_TABLE: 'tina_vector_store',\r?\n  LOCK_TABLE: 'tina_reindex_locks',\r?\n  vectorTableFromEnv: null,\r?\n  vectorTableUsingDefault: true,\r?\n  vectorTableMatchExpected: true,\r?\n  NODE_ENV: 'test',\r?\n  RENDER_SERVICE_NAME: null,\r?\n  RENDER_GIT_COMMIT: null,\r?\n  RENDER_INSTANCE_ID: null,\r?\n  INSTANCE_ID: '([0-9a-f]{16})',\r?\n  pid: ([1-9][0-9]*),\r?\n  engineVersion: '3\.0\.0'\r?\n\}/gu;
function validateAndNormalizeTestStreams(stdout, stderr, testPath) {
  const stdoutMarkerCount = (stdout.match(/\[DB IDENTITY\]/gu) ?? []).length;
  const stderrMarkerCount = (stderr.match(/\[DB IDENTITY\]/gu) ?? []).length;
  const expectedCount = testPath === DB_IDENTITY_TEST_PATH ? 1 : 0;
  assert(stderrMarkerCount === 0, `unexpected DB identity marker on stderr: ${testPath}`);
  assert(stdoutMarkerCount === expectedCount, `unexpected DB identity marker count for ${testPath}: ${stdoutMarkerCount}`);
  const matches = [...stdout.matchAll(DB_IDENTITY_RAW_PATTERN)];
  assert(matches.length === expectedCount, `DB identity block shape mismatch for ${testPath}`);
  const normalizedStdout = stdout.replace(DB_IDENTITY_RAW_PATTERN, (fullBlock, instanceId, pid) => {
    const instanceStart = fullBlock.indexOf(instanceId);
    const pidLabelStart = fullBlock.indexOf("  pid: ");
    const pidStart = pidLabelStart + "  pid: ".length;
    assert(instanceStart >= 0 && fullBlock.indexOf(instanceId, instanceStart + 1) === -1, `INSTANCE_ID capture offset is not unique: ${testPath}`);
    assert(pidLabelStart >= 0 && fullBlock.slice(pidStart, pidStart + pid.length) === pid, `pid capture offset is invalid: ${testPath}`);
    const afterInstance = `${fullBlock.slice(0, instanceStart)}<E2_VOLATILE_INSTANCE_ID>${fullBlock.slice(instanceStart + instanceId.length)}`;
    const adjustedPidStart = pidStart + ("<E2_VOLATILE_INSTANCE_ID>".length - instanceId.length);
    const normalizedBlock = `${afterInstance.slice(0, adjustedPidStart)}<E2_VOLATILE_PID>${afterInstance.slice(adjustedPidStart + pid.length)}`;
    const restoredInstance = `${normalizedBlock.slice(0, instanceStart)}${instanceId}${normalizedBlock.slice(instanceStart + "<E2_VOLATILE_INSTANCE_ID>".length)}`;
    const restoredPidStart = pidStart;
    const restoredBlock = `${restoredInstance.slice(0, restoredPidStart)}${pid}${restoredInstance.slice(restoredPidStart + "<E2_VOLATILE_PID>".length)}`;
    assert(restoredBlock === fullBlock, `normalization changed nonvolatile DB identity bytes: ${testPath}`);
    return normalizedBlock;
  });
  assert(!(normalizedStdout.match(/INSTANCE_ID: '[0-9a-f]{16}'/gu) ?? []).length, `volatile INSTANCE_ID survived normalization: ${testPath}`);
  assert(!(normalizedStdout.match(/pid: [1-9][0-9]*/gu) ?? []).length, `volatile pid survived normalization: ${testPath}`);
  return {
    normalizedStdout,
    normalizedStderr: stderr,
    normalizedCombined: `${normalizedStdout}${stderr}`,
    validatedVolatileDbIdentityBlockCount: matches.length,
    rawValidationPass: true,
  };
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
    const normalized = validateAndNormalizeTestStreams(stdout, stderr, testPath);
    assertNoSecretLikeText(normalized.normalizedCombined, `${testPath} normalized semantic projection`);
    const labels = [...stdout.matchAll(/^PASS (.+)$/gmu)].map((match) => match[1]);
    const summaries = [...stdout.matchAll(/(?:^|\n)(?:[^\n]*?:\s*)?(\d+) passed,\s*(\d+) failed(?:,\s*(\d+) assertions)?(?:\r?\n|$)/gmu)];
    assert(summaries.length === 1, `${testPath} emitted ${summaries.length} summaries`);
    const passed = Number(summaries[0][1]);
    const failed = Number(summaries[0][2]);
    const assertions = summaries[0][3] === undefined ? "NOT_REPORTED" : Number(summaries[0][3]);
    assert(failed === 0 && passed === labels.length && labels.length === expectedCases, `${testPath} case accounting mismatch`);
    executions.push({ command: `node --import <embedded-e2-isolation-guard> ${testPath}`, classification, source, isolation: { childEnvironment: "SCRUBBED_FIXED_ALLOWLIST_WITHOUT_PARENT_ENVIRONMENT_INHERITANCE", allowedEnvironmentKeys: ["NODE_ENV", "TZ", "DOTENV_CONFIG_PATH", "DOTENV_CONFIG_QUIET", "OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"], credentialValues: "INERT_NONSECRET_PLACEHOLDERS_NOT_PERSISTED_OR_PRINTED", dotenvSentinelPath: DOTENV_SENTINEL, dotenvSentinelConfirmedAbsent: true, preloadGuardSha256: sha256(Buffer.from(TEST_PRELOAD_GUARD_SOURCE, "utf8")), enforcedBlockedSurfaces: ["global fetch", "node:http request/get", "node:https request/get", "node:net connect/createConnection", "node:tls connect", "node:dns callback and promise lookup/resolve families", "node:fs .env read/open/read-stream surfaces"], guaranteeScope: "IN_PROCESS_PRELOAD_MONKEYPATCH_OF_LISTED_NODE_SURFACES; NOT A GENERAL OS SANDBOX" }, rawOutputHandling: { parsedForPassLabelsAndSummary: true, secretScanned: true, volatileDbIdentityShapeValidated: true, validatedVolatileDbIdentityBlockCount: normalized.validatedVolatileDbIdentityBlockCount, persistence: "RAW_ONLY_IN_MANIFEST_BOUND_OUTPUT_INVOCATION_COMMAND_LOG" }, r9FinalCommit: classification === "R9_CANONICAL" ? R9_FINAL_COMMIT : "NOT_APPLICABLE", r9FinalGitBlobOid: r9FinalGitBlobOid ?? "NOT_APPLICABLE", exitCode: result.status, signal: "NONE", passed, failed, assertions, rawStdoutSha256: sha256(Buffer.from(stdout, "utf8")), rawStderrSha256: sha256(Buffer.from(stderr, "utf8")), rawCombinedOutputSha256: sha256(Buffer.from(combined, "utf8")), normalizedStdoutSha256: sha256(Buffer.from(normalized.normalizedStdout, "utf8")), normalizedStderrSha256: sha256(Buffer.from(normalized.normalizedStderr, "utf8")), normalizedCombinedOutputSha256: sha256(Buffer.from(normalized.normalizedCombined, "utf8")), stdout, stderr, normalizedStdout: normalized.normalizedStdout, normalizedStderr: normalized.normalizedStderr });
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
        evidenceMappings: [{ path: testPath, sourceSha256: source.sha256, sourceBytes: source.bytes, sourceHeadGitBlobOid: source.headGitBlobOid, r9FinalGitBlobOid: r9FinalGitBlobOid ?? "NOT_APPLICABLE", ordinal: index + 1, literalPassLabel }],
      };
      (classification === "R9_CANONICAL" ? canonicalRecords : supplementalRecords).push(record);
    });
  }
  assert(canonicalRecords.length === 184, `R9 snapshot derived case count ${canonicalRecords.length}, expected 184`);
  assert(supplementalRecords.length === 84, `supplemental case count ${supplementalRecords.length}, expected 84`);
  return { executions, canonicalRecords, supplementalRecords };
}

function compactExecution(execution) {
  const { stdout, stderr, normalizedStdout, normalizedStderr, rawStdoutSha256, rawStderrSha256, rawCombinedOutputSha256, ...compact } = execution;
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
    `RAW_STDOUT_SHA256 ${item.rawStdoutSha256}`,
    `RAW_STDERR_SHA256 ${item.rawStderrSha256}`,
    `RAW_COMBINED_OUTPUT_SHA256 ${item.rawCombinedOutputSha256}`,
    `RAW_STDOUT_JSON ${JSON.stringify(item.stdout)}`,
    `RAW_STDERR_JSON ${JSON.stringify(item.stderr)}`,
  ].join("\n")).join("\n\n").concat("\n");
}

function semanticProjectionLog(executions) {
  return executions.map((item) => [
    `COMMAND ${item.command}`,
    `CLASSIFICATION ${item.classification}`,
    `EXIT ${item.exitCode}`,
    `SOURCE_SHA256 ${item.source.sha256}`,
    `SOURCE_HEAD_BLOB ${item.source.headGitBlobOid}`,
    `R9_FINAL_BLOB ${item.r9FinalGitBlobOid}`,
    `NORMALIZED_STDOUT_SHA256 ${item.normalizedStdoutSha256}`,
    `NORMALIZED_STDERR_SHA256 ${item.normalizedStderrSha256}`,
    `NORMALIZED_COMBINED_OUTPUT_SHA256 ${item.normalizedCombinedOutputSha256}`,
    "NORMALIZED_STDOUT_BEGIN", item.normalizedStdout.replace(/\s+$/u, ""), "NORMALIZED_STDOUT_END",
    "NORMALIZED_STDERR_BEGIN", item.normalizedStderr.replace(/\s+$/u, ""), "NORMALIZED_STDERR_END",
  ].join("\n")).join("\n\n").concat("\n");
}

function validateStoredRawCommandLog(rawLog, regeneratedExecutions) {
  assertNoSecretLikeText(rawLog, "stored raw command log");
  const sections = rawLog.trimEnd().split("\n\n");
  assert(sections.length === TEST_SPECS.length, `stored raw command log section count ${sections.length}, expected ${TEST_SPECS.length}`);
  const projectedExecutions = sections.map((section, index) => {
    const lines = section.split("\n");
    assert(lines.length === 11, `stored raw command section ${index + 1} must contain exactly 11 lines`);
    const regenerated = regeneratedExecutions[index];
    const [testPath, expectedCases, classification] = TEST_SPECS[index];
    const expectedStableLines = [
      `COMMAND ${regenerated.command}`,
      `CLASSIFICATION ${classification}`,
      `EXIT 0`,
      `SOURCE_SHA256 ${regenerated.source.sha256}`,
      `SOURCE_HEAD_BLOB ${regenerated.source.headGitBlobOid}`,
      `R9_FINAL_BLOB ${regenerated.r9FinalGitBlobOid}`,
    ];
    assert(JSON.stringify(lines.slice(0, 6)) === JSON.stringify(expectedStableLines), `stored raw command stable headers mismatch: ${testPath}`);
    const stdoutHash = /^RAW_STDOUT_SHA256 ([0-9a-f]{64})$/u.exec(lines[6]);
    const stderrHash = /^RAW_STDERR_SHA256 ([0-9a-f]{64})$/u.exec(lines[7]);
    const combinedHash = /^RAW_COMBINED_OUTPUT_SHA256 ([0-9a-f]{64})$/u.exec(lines[8]);
    assert(stdoutHash && stderrHash && combinedHash, `stored raw hash header invalid: ${testPath}`);
    assert(lines[9].startsWith("RAW_STDOUT_JSON ") && lines[10].startsWith("RAW_STDERR_JSON "), `stored raw JSON framing invalid: ${testPath}`);
    let stdout;
    let stderr;
    try {
      stdout = JSON.parse(lines[9].slice("RAW_STDOUT_JSON ".length));
      stderr = JSON.parse(lines[10].slice("RAW_STDERR_JSON ".length));
    } catch (error) {
      fail(`stored raw JSON parse failure for ${testPath}: ${error.message}`);
    }
    assert(typeof stdout === "string" && typeof stderr === "string", `stored raw streams must decode to strings: ${testPath}`);
    const combined = `${stdout}${stderr}`;
    assert(sha256(Buffer.from(stdout, "utf8")) === stdoutHash[1], `stored raw stdout hash mismatch: ${testPath}`);
    assert(sha256(Buffer.from(stderr, "utf8")) === stderrHash[1], `stored raw stderr hash mismatch: ${testPath}`);
    assert(sha256(Buffer.from(combined, "utf8")) === combinedHash[1], `stored raw combined hash mismatch: ${testPath}`);
    assertNoSecretLikeText(combined, `stored raw streams ${testPath}`);
    const labels = [...stdout.matchAll(/^PASS (.+)$/gmu)].map((match) => match[1]);
    const summaries = [...stdout.matchAll(/(?:^|\n)(?:[^\n]*?:\s*)?(\d+) passed,\s*(\d+) failed(?:,\s*(\d+) assertions)?(?:\r?\n|$)/gmu)];
    assert(summaries.length === 1, `stored raw summary count mismatch: ${testPath}`);
    assert(Number(summaries[0][1]) === expectedCases && Number(summaries[0][2]) === 0 && labels.length === expectedCases, `stored raw semantic case accounting mismatch: ${testPath}`);
    const normalized = validateAndNormalizeTestStreams(stdout, stderr, testPath);
    return {
      ...regenerated,
      stdout,
      stderr,
      normalizedStdout: normalized.normalizedStdout,
      normalizedStderr: normalized.normalizedStderr,
      normalizedStdoutSha256: sha256(Buffer.from(normalized.normalizedStdout, "utf8")),
      normalizedStderrSha256: sha256(Buffer.from(normalized.normalizedStderr, "utf8")),
      normalizedCombinedOutputSha256: sha256(Buffer.from(normalized.normalizedCombined, "utf8")),
    };
  });
  return {
    rawLogSha256: sha256(Buffer.from(rawLog, "utf8")),
    sectionCount: sections.length,
    semanticProjection: semanticProjectionLog(projectedExecutions),
    pass: true,
  };
}

function aggregateInputHash(inputs) {
  const unique = new Map();
  for (const input of inputs) unique.set(input.path, input);
  const ordered = [...unique.values()].sort((a, b) => compareText(a.path, b.path));
  const text = ordered.map((input) => `${input.sha256}  ${input.path}`).join("\n").concat("\n");
  return { count: ordered.length, sha256: sha256(Buffer.from(text, "utf8")), records: ordered };
}

function buildPredecessorDisclosure(options = {}) {
  const runnerPath = options.runnerPath ?? PREDECESSOR_RUNNER;
  const outputPath = options.outputPath ?? PREDECESSOR_OUTPUT;
  const expectedRunnerSha256 = options.expectedRunnerSha256 ?? null;
  const expectedManifestSha256 = options.expectedManifestSha256 ?? PREDECESSOR_MANIFEST_SHA256;
  const disposition = options.disposition ?? "INTERNAL_REVIEW_REJECTED_NONTERMINAL_CHANGES_REQUESTED";
  assert(fs.existsSync(abs(runnerPath)), `predecessor runner is missing: ${runnerPath}`);
  assert(fs.existsSync(abs(outputPath)) && fs.statSync(abs(outputPath)).isDirectory(), `predecessor output is missing: ${outputPath}`);
  const runnerRawIdentity = rawPathIdentity(runnerPath, "PRESERVED_UNTRACKED_PREDECESSOR_RUNNER_RAW_BYTES");
  if (expectedRunnerSha256 !== null) assert(runnerRawIdentity.sha256 === expectedRunnerSha256, `predecessor runner hash mismatch: ${runnerPath}`);
  const manifestPath = `${outputPath}/E2_EVIDENCE_MANIFEST.sha256`;
  const manifestRawIdentity = rawPathIdentity(manifestPath, "PRESERVED_PREDECESSOR_SELF_EXCLUDED_MANIFEST_RAW_BYTES");
  assert(manifestRawIdentity.sha256 === expectedManifestSha256, `predecessor manifest raw SHA-256 mismatch: ${manifestPath}`);
  const expectedFileNames = [...DATA_FILES, MANIFEST_FILE].sort(compareText);
  const directoryEntries = fs.readdirSync(abs(outputPath), { withFileTypes: true });
  assert(directoryEntries.every((entry) => entry.isFile()), "predecessor output contains a non-file entry");
  const actualFileNames = directoryEntries.map((entry) => entry.name).sort(compareText);
  assert(
    JSON.stringify(actualFileNames) === JSON.stringify(expectedFileNames),
    `predecessor output file set mismatch: ${JSON.stringify(actualFileNames)}`,
  );
  const coveredDataFiles = DATA_FILES.map((fileName) =>
    rawPathIdentity(
      `${outputPath}/${fileName}`,
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
    runnerPath,
    outputPath,
    runnerExists: true,
    outputExists: true,
    disposition,
    terminalPassClaimedOrInherited: false,
    modifiedByCurrentRevision: false,
    currentRevision: 3,
    runnerRawIdentity,
    selfExcludedManifest: {
      path: manifestPath,
      expectedRawSha256: expectedManifestSha256,
      actualRawSha256: manifestRawIdentity.sha256,
      bytes: manifestRawIdentity.bytes,
      exactContentValidated: true,
    },
    directoryIdentity,
    replayFailure: options.replayFailure ?? "NONE_RECORDED",
  };
}

function buildV2PredecessorDisclosure() {
  return buildPredecessorDisclosure({
    runnerPath: V2_RUNNER_PATH,
    outputPath: V2_OUTPUT_DIR,
    expectedRunnerSha256: V2_RUNNER_SHA256,
    expectedManifestSha256: V2_MANIFEST_SHA256,
    disposition: "NONTERMINAL_REPLAY_VERIFICATION_FAILURE_SUPERSEDED_BY_BOUNDED_REVISION_3",
    replayFailure: {
      classification: "DETERMINISTIC_REPLAY_BYTE_COMPARISON_FAILURE",
      sourceTestPath: DB_IDENTITY_TEST_PATH,
      rawOutputMarker: "[DB IDENTITY]",
      exactVolatileFields: ["INSTANCE_ID (random 16-hex per-process identity)", "pid (child process ID)"],
      cause: "Revision 2 included raw child-stream hashes and the raw command transcript in regenerated byte comparisons; the R4 startup DB-identity line changes INSTANCE_ID and pid on each child process.",
      semanticTestFailure: false,
      terminalPassClaimedOrInherited: false,
    },
  });
}

function verifyPostTestIntegrity({ governedInputs, preDirtyPaths, preProtectedFiles, preRunner, prePredecessors }) {
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
  assert(postRunner.sha256 === preRunner.sha256 && postRunner.bytes === preRunner.bytes, "revision-3 runner changed during tests");
  const postPredecessors = { v1: buildPredecessorDisclosure(), v2: buildV2PredecessorDisclosure() };
  for (const key of ["v1", "v2"]) {
    assert(postPredecessors[key].runnerRawIdentity.sha256 === prePredecessors[key].runnerRawIdentity.sha256, `${key} predecessor runner changed during tests`);
    assert(
      postPredecessors[key].directoryIdentity.sha256 === prePredecessors[key].directoryIdentity.sha256 &&
        JSON.stringify(postPredecessors[key].directoryIdentity.files) === JSON.stringify(prePredecessors[key].directoryIdentity.files),
      `${key} predecessor five-file directory identity changed during tests`,
    );
  }
  const postAggregate = aggregateInputHash(records.map((item) => ({ path: item.path, sha256: item.postSha256, bytes: item.postBytes })));
  const preAggregate = aggregateInputHash([...unique.values()]);
  assert(postAggregate.sha256 === preAggregate.sha256 && postAggregate.count === preAggregate.count, "governed input aggregate changed during tests");
  return {
    trackedDirtyPathSet: { pre: preDirtyPaths, post: postDirtyPaths, equal: true },
    protectedFiles: { pre: preProtectedFiles, post: postProtectedFiles, equal: true },
    governedInputRawBytes: { count: records.length, preAggregateSha256: preAggregate.sha256, postAggregateSha256: postAggregate.sha256, mismatchCount: 0, records },
    runnerRawBytes: { pre: preRunner, post: postRunner, equal: true },
    predecessorIntegrity: { pre: prePredecessors, post: postPredecessors, equal: true },
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
  const predecessors = { v1: buildPredecessorDisclosure(), v2: buildV2PredecessorDisclosure() };
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
  const deterministicSemanticProjection = semanticProjectionLog(tests.executions);
  assertNoSecretLikeText(deterministicSemanticProjection, "deterministic semantic projection");
  const postTestIntegrity = verifyPostTestIntegrity({
    governedInputs,
    preDirtyPaths,
    preProtectedFiles: protectedFiles,
    preRunner: runner,
    prePredecessors: predecessors,
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
    prohibitedPaths: [...Object.keys(PROTECTED), "knowledge/CURRENT_STATE.md", "B2-B6 artifacts", PREDECESSOR_RUNNER, `${PREDECESSOR_OUTPUT}/**`, V2_RUNNER_PATH, `${V2_OUTPUT_DIR}/**`, "all production/runtime/oracle/validator/test/source inputs"],
    commands: { verifyOnly: `node ${RUNNER_PATH} --verify-only`, output: `node ${RUNNER_PATH} --out ${OUTPUT_DIR}`, verifyEvidence: `node ${RUNNER_PATH} --verify-evidence`, focusedTests: TEST_SPECS.map(([testPath]) => `node --import <embedded-e2-isolation-guard> ${testPath}`) },
    expectedOutputs: [...DATA_FILES, MANIFEST_FILE],
    passCriteria: ["exact branch/HEAD, reviewed Node runtime identity, and zero staged paths", "package.json and package-lock.json are HEAD-locked; each directly imported nonbuilt-in installed package.json remains inside workspace node_modules and its name/version match the lockfile version; lockfile integrity is required and recorded but is not verified against installed package bytes", "all tracked inputs and recursively reachable relative local ESM dependencies equal starting HEAD after Git filters", "all ten canonical test entry blobs equal their R9-final blobs", "counts and uniqueness equal the exact acceptance algebra", "every record is individually evidence-bound and every material field has a typed resolution", "all 13 focused tests pass exact case accounting under the scrubbed environment and embedded no-network/no-.env preload guard", "raw child output is parsed and secret-scanned and any DB-identity block must match the exact expected shape before only INSTANCE_ID and pid are normalized in the deterministic semantic projection", "post-test tracked dirty paths, protected bytes, governed inputs, runner, and both complete five-file predecessor directory identities equal their pretest state", "protected byte hashes pass and all generated persisted text passes secret-like scanning", "the three semantic JSON files reproduce byte-for-byte; their embedded deterministic projection matches the normalized stored raw log; the stored raw log and self-excluded manifest are validated but excluded from regenerated-byte comparison"],
    failureCriteria: ["any identity, staging, path, dependency, package/lock identity, runtime, isolation, post-test integrity, hash, JSON schema, id, prompt, count, uniqueness, mapping, material-resolution, R9-blob, test, output, manifest, protected-file, or secret-scan assertion fails"],
    evidence: { exactFiveFileOutputSet: [...DATA_FILES, MANIFEST_FILE], deterministicByteComparedSemanticJsonFiles: DATA_FILES.filter((name) => name.endsWith(".json")), deterministicProjectionPersistence: "EMBEDDED_IN_E2_EXECUTION_RESULT_JSON", rawCommandLog: "IMMUTABLE_OUTPUT_INVOCATION_CAPTURE_MANIFEST_BOUND_VALIDATED_NOT_REGENERATED_BYTE_COMPARED", selfExcludedManifest: "STORED_AND_HASH_VALIDATED_NOT_REGENERATED_BYTE_COMPARED", exactEvidenceMappingCount, historicalClaimsReadjudicated: false, postTestIntegrity },
    review: { internalReviewRequired: true, internalReviewStatus: "PENDING", externalReviewRequired: false },
    noExternalRequired: true,
    currentState: { updateAuthorized: false, updated: false },
    gitPublication: { stageCommitPushAuthorized: false, status: "DEFERRED_UNTIL_SEPARATELY_GOVERNED_AFTER_INTERNAL_REVIEW" },
    b2ThroughB6: { disposition: "OPEN_UNCHANGED_OUT_OF_SCOPE", modified: false },
    rollback: "No overwrite is possible. If an interrupted output-mode invocation leaves only the exact new v3 directory, preserve diagnostics and remove only that directory under separately authorized cleanup; no runtime rollback applies.",
    predecessorDisclosure: predecessors,
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
    resultCode: "E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3_PASS",
    startingHead: EXPECTED_HEAD,
    runnerRawIdentity: runner,
    inputSet: { count: inputSet.count, sha256: inputSet.sha256 },
    checks: { ...counts, reviewedNodeRuntimeIdentityPass: true, deterministicSuiteCount: 13, deterministicSuitePassedCount: 13, deterministicSuiteFailedCount: 0, canonicalTestSuiteCount: 10, supplementalTestSuiteCount: 3, recursivelyLockedLocalFileCount: dependencyClosure.inputs.length, relativeImportEdgeCount: dependencyClosure.edges.length, unresolvedRelativeImportCount: 0, directImportedPackageIdentityCount: packageIdentity.identities.length, directImportedPackageNameVersionMismatchCount: 0, lockfileIntegrityPresentCount: packageIdentity.identities.length, lockfileIntegrityVerifiedAgainstInstalledPackageBytesCount: 0, builtinImportOccurrenceCount: packageIdentity.builtinImports.length, scrubbedIsolatedTestProcessCount: 13, rawTestStreamParsedCount: 13, rawTestStreamSecretScannedCount: 13, validatedVolatileDbIdentityBlockCount: tests.executions.reduce((sum, item) => sum + item.rawOutputHandling.validatedVolatileDbIdentityBlockCount, 0), deterministicSemanticProjectionSha256: sha256(Buffer.from(deterministicSemanticProjection, "utf8")), postTestGovernedInputReverifiedCount: postTestIntegrity.governedInputRawBytes.count, postTestGovernedInputMismatchCount: 0, postTestTrackedDirtyPathSetChanged: false, postTestRunnerChanged: false, postTestV1PredecessorFiveFileDirectoryChanged: false, postTestV2PredecessorFiveFileDirectoryChanged: false, v1PredecessorManifestCoveredDataFileCount: predecessors.v1.directoryIdentity.manifestCoveredDataFileCount, v2PredecessorManifestCoveredDataFileCount: predecessors.v2.directoryIdentity.manifestCoveredDataFileCount, v1PredecessorDirectoryIdentityFileCount: predecessors.v1.directoryIdentity.fileCount, v2PredecessorDirectoryIdentityFileCount: predecessors.v2.directoryIdentity.fileCount, protectedFileCount: protectedFiles.length, protectedFileMismatchCount: 0, secretLikeOutputFindingCount: 0 },
    protectedFiles,
    testExecutions: tests.executions.map(compactExecution),
    deterministicSemanticProjection: { normalizationScope: "EXACT_VALIDATED_R4_DB_IDENTITY_INSTANCE_ID_AND_PID_FIELDS_ONLY", sha256: sha256(Buffer.from(deterministicSemanticProjection, "utf8")), transcript: deterministicSemanticProjection },
    runtimeAndPackageIdentity: { nodeRuntimeIdentity: runtimeIdentity(), packageRootInputs, packageIdentity },
    postTestIntegrity,
    predecessorDisclosure: predecessors,
    governance: { productionOrRuntimeChanged: false, currentStateUpdated: false, b2ThroughB6Changed: false, existingE2V1Changed: false, existingE2V2Changed: false, existingEvidenceChanged: false, internalReviewRequired: true, publicationDeferred: true },
  };
  return { contract, strictInventory, result, rawLog: commandLog(tests.executions), deterministicSemanticProjection, verificationExecutions: tests.executions };
}

function artifactFiles(artifacts) {
  const files = new Map([
    ["E2_EXECUTION_CONTRACT.json", jsonText(artifacts.contract)],
    ["E2_STRICT_CANONICAL_INVENTORY.json", jsonText(artifacts.strictInventory)],
    ["E2_EXECUTION_RESULT.json", jsonText(artifacts.result)],
    ["E2_COMMAND_OUTPUT.log", artifacts.rawLog],
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

function verifyEvidence(artifacts, generated) {
  const actualNames = fs.readdirSync(abs(OUTPUT_DIR)).sort(compareText);
  const expectedNames = [...DATA_FILES, MANIFEST_FILE].sort(compareText);
  assert(JSON.stringify(actualNames) === JSON.stringify(expectedNames), "existing v3 output file set differs from exact allowlist");
  const semanticJsonNames = DATA_FILES.filter((name) => name.endsWith(".json"));
  for (const name of semanticJsonNames) {
    const expected = generated.files.get(name);
    const actual = fs.readFileSync(path.join(abs(OUTPUT_DIR), name), "utf8");
    assert(actual === expected, `semantic JSON byte comparison failed: ${name}`);
    assertNoSecretLikeText(actual, `${OUTPUT_DIR}/${name}`);
  }
  const storedRawLog = fs.readFileSync(path.join(abs(OUTPUT_DIR), "E2_COMMAND_OUTPUT.log"), "utf8");
  const storedRawValidation = validateStoredRawCommandLog(storedRawLog, artifacts.verificationExecutions);
  assert(
    storedRawValidation.semanticProjection === artifacts.deterministicSemanticProjection,
    "stored raw command log normalized semantic projection differs from current rerun",
  );
  const actualManifest = fs.readFileSync(path.join(abs(OUTPUT_DIR), MANIFEST_FILE), "utf8");
  assertNoSecretLikeText(actualManifest, `${OUTPUT_DIR}/${MANIFEST_FILE}`);
  const lines = actualManifest.trimEnd().split("\n");
  assert(lines.length === 4, "manifest must contain exactly four self-excluded entries");
  const manifestedNames = new Set();
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  (.+)$/u.exec(line);
    assert(match, `invalid manifest line: ${line}`);
    const relativePath = match[2];
    assert(relativePath.startsWith(`${OUTPUT_DIR}/`), `manifest path outside output: ${relativePath}`);
    const fileName = relativePath.slice(`${OUTPUT_DIR}/`.length);
    assert(DATA_FILES.includes(fileName), `manifest contains non-allowlisted data file: ${relativePath}`);
    assert(!manifestedNames.has(fileName), `manifest contains duplicate data file: ${fileName}`);
    manifestedNames.add(fileName);
    assert(sha256(fs.readFileSync(abs(relativePath))) === match[1], `manifest hash mismatch: ${relativePath}`);
  }
  assert(DATA_FILES.every((name) => manifestedNames.has(name)), "manifest does not cover the exact four data files");
  return { semanticJsonByteComparedCount: semanticJsonNames.length, storedRawValidation, storedManifestValidated: true };
}

function main() {
  const { mode } = parseArguments(process.argv.slice(2));
  assertPreconditions(mode);
  const artifacts = buildArtifacts();
  const generated = artifactFiles(artifacts);
  if (mode === "OUTPUT") writeArtifacts(generated);
  if (mode === "VERIFY_EVIDENCE") verifyEvidence(artifacts, generated);
  console.log(jsonText({ identity: IDENTITY, mode, status: artifacts.result.status, resultCode: artifacts.result.resultCode, checks: artifacts.result.checks, inputSet: artifacts.result.inputSet, wroteOutput: mode === "OUTPUT", verifiedExistingEvidence: mode === "VERIFY_EVIDENCE", outputDirectory: mode === "VERIFY_ONLY" ? "NOT_WRITTEN" : OUTPUT_DIR }));
}

try {
  main();
} catch (error) {
  console.error(jsonText({ identity: IDENTITY, status: "FAIL", resultCode: "E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3_FAIL", error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}
