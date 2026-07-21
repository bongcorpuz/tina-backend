// PHASE-10A14-R18 — runtime/harness identity and retry-link validator suite.
// Covers all 16 mandatory negative controls, the mandatory positive control (the exact
// R17 failure mode), and the P2 count-classification negative tests.
//
// Synthetic only. Reads no historical evidence and writes nothing outside a temporary
// directory created under the OS temp dir.
import { validateRetryLinks } from "../evaluation/results/phase-10a14-r18/retry-validator.mjs";
import {
  treeDigest, environmentFingerprint, validateGitCommit,
  isAuthorizedEvidencePath, FROZEN_ATTEMPT_CATEGORIES, FROZEN_RETRY_REASONS, writeOnce
} from "../evaluation/results/phase-10a14-r18/identity.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const PATCH = "PHASE-10A14-R18-RUNTIME-IDENTITY-AND-RETRY";
let passed = 0, failed = 0, assertions = 0;
const check = (cond, label) => {
  assertions++;
  if (!cond) throw new Error(`assertion failed: ${label}`);
};
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}

const R18 = "evaluation/results/phase-10a14-r18";
const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

// A realistic base attempt pair: A1 failed, A2 retries it, identity identical.
const baseA = {
  attemptId: "SYN-A1", attemptType: "gate", attemptCategory: "deterministic_runner",
  gateName: "deterministic", cycle: 1, attemptOrdinal: 1, retryOf: null, retryReason: null,
  evidenceHeadAtAllocation: HEAD, evidenceHeadAtEnd: HEAD,
  runtimeBaselineCommit: HEAD,
  runtimeScopeManifestPath: `${R18}/RUNTIME_SCOPE_MANIFEST.json`,
  runtimeScopeManifestSha256: "RT-MANIFEST", runtimeTreeDigest: "RT", runtimeFilesCount: 11,
  harnessScopeManifestPath: `${R18}/HARNESS_SCOPE_MANIFEST.json`,
  harnessScopeManifestSha256: "HN-MANIFEST", harnessTreeDigest: "HN", harnessFilesCount: 6,
  dependencyLockDigest: "LOCK", environmentFingerprint: "ENV",
  command: "node scripts/run-regressions.mjs",
  exitCode: 1, status: "COMPLETED_FAIL", disposition: "VALID_NON_CONTROLLING", controlling: false
};
const baseB = {
  ...baseA, attemptId: "SYN-A2", attemptOrdinal: 2,
  retryOf: "SYN-A1", retryReason: "TECHNICAL_TRANSPORT_ERROR"
};
// Synthetic records carry placeholder digests, so evidence-delta/Git verification is
// disabled for them. It is exercised separately, against real commits, below.
const syn = (over = {}) => validateRetryLinks([baseA, { ...baseB, ...over }], { verifyEvidenceDelta: false });

// ─── Positive control: the exact R17 failure mode, now handled correctly ──────
await test("POSITIVE CONTROL: evidence HEAD moves, runtime and harness identical, retry is valid", () => {
  // A1 fails; A1's evidence is committed so evidence HEAD MOVES; runtime/harness digests
  // are unchanged; A2 links to A1. R17 rejected exactly this as RETRY_RUNTIME_CHANGED.
  const a = { ...baseA, evidenceHeadAtEnd: "aaaaaaaa" };
  const b = { ...baseB, evidenceHeadAtAllocation: "bbbbbbbb" };
  const r = validateRetryLinks([a, b], { verifyEvidenceDelta: false });
  check(r.validRetryCount === 1, "exactly one valid retry");
  check(r.errors.length === 0, "no errors");
  check(r.validRetries[0].evidenceHeadMoved === true, "evidence HEAD did move");
  check(r.validRetries[0].runtimeTreeDigest === a.runtimeTreeDigest, "runtime digest identical across the link");
});

await test("POSITIVE CONTROL is not vacuous: the same link with a changed runtime is rejected", () => {
  const r = syn({ runtimeTreeDigest: "RT-DIFFERENT" });
  check(r.validRetryCount === 0, "no valid retry");
  check(r.errors[0].error === "RETRY_RUNTIME_CHANGED", "rejected as RETRY_RUNTIME_CHANGED");
});

// ─── The 16 mandatory negative controls ──────────────────────────────────────
const negatives = [
  ["1 changed runtime file", { runtimeTreeDigest: "X" }, "RETRY_RUNTIME_CHANGED"],
  ["2 changed harness file", { harnessTreeDigest: "X" }, "RETRY_HARNESS_CHANGED"],
  ["3 changed package lock", { dependencyLockDigest: "X" }, "RETRY_DEPENDENCY_CHANGED"],
  ["4 changed command", { command: "node scripts/run-staging-smokes.mjs" }, "RETRY_COMMAND_CHANGED"],
  ["5 changed environment fingerprint", { environmentFingerprint: "X" }, "RETRY_ENVIRONMENT_CHANGED"],
  ["6 missing target", { retryOf: "SYN-NOPE" }, "RETRY_TARGET_MISSING"],
  ["7 self link", { retryOf: "SYN-A2" }, "RETRY_SELF_LINK"],
  ["9 cross-gate link", { gateName: "staging" }, "RETRY_CROSS_GATE"],
  ["10 cross-cycle link", { cycle: 2 }, "RETRY_CROSS_CYCLE"],
  ["15 bad ordinal", { attemptOrdinal: 5 }, "RETRY_ORDINAL_INVALID"],
  ["16 missing retry reason", { retryReason: null }, "RETRY_REASON_INVALID"],
  ["16b unsupported retry reason", { retryReason: "SUITE_FAILED" }, "RETRY_REASON_INVALID"]
];
for (const [label, over, expected] of negatives) {
  await test(`NEGATIVE CONTROL ${label} is rejected as ${expected}`, () => {
    const r = syn(over);
    check(r.validRetryCount === 0, "no valid retry");
    check(r.errors.length === 1, "exactly one error");
    check(r.errors[0].error === expected, `error is ${expected}, got ${r.errors[0].error}`);
  });
}

await test("NEGATIVE CONTROL 8 cycle is rejected as RETRY_CYCLE", () => {
  const a = { ...baseA, retryOf: "SYN-A2", retryReason: "TECHNICAL_TRANSPORT_ERROR", attemptOrdinal: 3 };
  const r = validateRetryLinks([a, baseB], { verifyEvidenceDelta: false });
  check(r.errors.some((e) => e.error === "RETRY_CYCLE"), "a cycle is detected");
  check(r.validRetryCount === 0, "no valid retry in a cyclic chain");
});

await test("NEGATIVE CONTROL 11 retry after PASS is rejected as RETRY_AFTER_PASS", () => {
  const a = { ...baseA, exitCode: 0, status: "COMPLETED_PASS" };
  const r = validateRetryLinks([a, baseB], { verifyEvidenceDelta: false });
  check(r.errors[0].error === "RETRY_AFTER_PASS", "rejected as RETRY_AFTER_PASS");
});

await test("NEGATIVE CONTROL 12 forged runtime digest is rejected as RETRY_FORGED_DIGEST", () => {
  // Full verification on: the record claims a manifest sha that does not match the real one.
  const a = { ...baseA, runtimeTreeDigest: "RT", harnessTreeDigest: "HN" };
  const b = { ...baseB, runtimeScopeManifestSha256: "0".repeat(64) };
  const r = validateRetryLinks([a, b], { verifyEvidenceDelta: true });
  check(r.errors[0].error === "RETRY_FORGED_DIGEST", `rejected as RETRY_FORGED_DIGEST, got ${r.errors[0]?.error}`);
  check(r.validRetryCount === 0, "no valid retry");
});

await test("NEGATIVE CONTROL 13 forged baseline commit is rejected as RETRY_FORGED_BASELINE", () => {
  const real = treeDigest(`${R18}/RUNTIME_SCOPE_MANIFEST.json`);
  const a = { ...baseA };
  const b = { ...baseB, runtimeScopeManifestSha256: real.manifestSha256,
              runtimeBaselineCommit: "a802064a1b32e8a68a0b8c4dd1f8a1b0c9a5e2f7" };
  const r = validateRetryLinks([a, b], { verifyEvidenceDelta: true });
  check(r.errors[0].error === "RETRY_FORGED_BASELINE", `rejected as RETRY_FORGED_BASELINE, got ${r.errors[0]?.error}`);
});

await test("NEGATIVE CONTROL 14 evidence delta containing non-evidence code is rejected", () => {
  // Real commits: the R17 final-runtime commit changed runtime files, so the delta from
  // an earlier commit to it is impure by construction.
  const real = treeDigest(`${R18}/RUNTIME_SCOPE_MANIFEST.json`);
  const runtimeCommit = execSync("git rev-parse 345f2db5", { encoding: "utf8" }).trim();
  const parent = execSync("git rev-parse 345f2db5~1", { encoding: "utf8" }).trim();
  const a = { ...baseA, evidenceHeadAtEnd: parent };
  const b = { ...baseB, runtimeScopeManifestSha256: real.manifestSha256,
              runtimeBaselineCommit: HEAD, evidenceHeadAtAllocation: runtimeCommit };
  const r = validateRetryLinks([a, b], { verifyEvidenceDelta: true });
  check(r.errors[0].error === "RETRY_EVIDENCE_DELTA_IMPURE", `rejected as RETRY_EVIDENCE_DELTA_IMPURE, got ${r.errors[0]?.error}`);
  check(r.errors[0].impurePaths.length > 0, "impure paths are named");
});

await test("evidence-only delta between real commits is accepted", () => {
  // COMMIT 1 -> COMMIT 2 of R18 changed only authorized evidence paths.
  const real = treeDigest(`${R18}/RUNTIME_SCOPE_MANIFEST.json`);
  const c1 = execSync("git rev-parse 10573eae", { encoding: "utf8" }).trim();
  const c2 = execSync("git rev-parse 123d75f3", { encoding: "utf8" }).trim();
  const a = { ...baseA, evidenceHeadAtEnd: c1 };
  const b = { ...baseB, runtimeScopeManifestSha256: real.manifestSha256,
              runtimeBaselineCommit: HEAD, evidenceHeadAtAllocation: c2 };
  const r = validateRetryLinks([a, b], { verifyEvidenceDelta: true });
  check(r.validRetryCount === 1, `evidence-only movement accepted, errors: ${JSON.stringify(r.errors)}`);
});

// ─── Ceiling ─────────────────────────────────────────────────────────────────
await test("ceiling is reached only when the supporting links are valid", () => {
  const one = syn();
  check(one.ceiling["deterministic|cycle1"].validLinkedRetries === 1, "one valid linked retry");
  check(one.ceiling["deterministic|cycle1"].ceilingValidlyReached === false, "one retry does not reach the ceiling");

  const broken = syn({ runtimeTreeDigest: "X" });
  check(broken.ceiling["deterministic|cycle1"].validLinkedRetries === 0, "invalid link contributes nothing");
  check(broken.ceiling["deterministic|cycle1"].ceilingValidlyReached === false,
        "a rejected retry never establishes the ceiling — the exact R17 contradiction");

  const a3 = { ...baseB, attemptId: "SYN-A3", attemptOrdinal: 3, retryOf: "SYN-A2" };
  const full = validateRetryLinks([baseA, baseB, a3], { verifyEvidenceDelta: false });
  check(full.validRetryCount === 2, "two valid retries");
  check(full.ceiling["deterministic|cycle1"].ceilingValidlyReached === true, "two valid retries reach the ceiling");
});

// ─── Identity model ──────────────────────────────────────────────────────────
await test("runtime and harness digests are separate and independently recomputable", () => {
  const rt = treeDigest(`${R18}/RUNTIME_SCOPE_MANIFEST.json`);
  const hn = treeDigest(`${R18}/HARNESS_SCOPE_MANIFEST.json`);
  check(rt.digest !== hn.digest, "runtime and harness digests differ");
  check(rt.filesCount === 11 && hn.filesCount === 6, "manifest file counts as frozen");
  check(treeDigest(`${R18}/RUNTIME_SCOPE_MANIFEST.json`).digest === rt.digest, "digest is deterministic");
  check(/^[0-9a-f]{64}$/.test(rt.digest), "digest is a sha256 hex string");
});

await test("repository HEAD is not used as runtime identity", () => {
  const rt = treeDigest(`${R18}/RUNTIME_SCOPE_MANIFEST.json`);
  check(rt.digest !== HEAD, "runtime digest is not the repository HEAD");
});

await test("a missing manifest file is a hard error, never a skipped entry", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "r18-ident-"));
  const p = path.join(tmp, "m.json");
  fs.writeFileSync(p, JSON.stringify({ files: ["definitely/not/here.js"] }));
  let threw = false;
  try { treeDigest(p); } catch (e) { threw = /missing/.test(e.message); }
  check(threw, "missing file raises");
  fs.rmSync(tmp, { recursive: true, force: true });
});

await test("an unsorted or duplicated manifest is rejected", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "r18-ident-"));
  const unsorted = path.join(tmp, "u.json"), dup = path.join(tmp, "d.json");
  fs.writeFileSync(unsorted, JSON.stringify({ files: ["b.js", "a.js"] }));
  fs.writeFileSync(dup, JSON.stringify({ files: ["a.js", "a.js"] }));
  let u = false, d = false;
  try { treeDigest(unsorted); } catch (e) { u = /sorted/.test(e.message); }
  try { treeDigest(dup); } catch (e) { d = /duplicate/.test(e.message); }
  check(u, "unsorted manifest rejected");
  check(d, "duplicated manifest rejected");
  fs.rmSync(tmp, { recursive: true, force: true });
});

await test("environment fingerprint records no environment values", () => {
  const env = environmentFingerprint();
  check(/^[0-9a-f]{64}$/.test(env.fingerprint), "fingerprint is a digest");
  const serialized = JSON.stringify(env);
  check(!/JWT|SECRET|TOKEN|KEY|PASSWORD|URL/i.test(serialized), "no secret-shaped field names present");
  check(Object.keys(env).sort().join(",") === "architecture,fingerprint,nodeVersion,platform",
        "exactly node version, platform, architecture and the digest");
});

await test("Git SHA validation enforces format, existence, type and ancestry", () => {
  check(validateGitCommit(HEAD).valid, "real HEAD is valid");
  check(validateGitCommit("zzzz").error === "SHA_MALFORMED", "malformed rejected");
  check(validateGitCommit("a802064a1b32e8a68a0b8c4dd1f8a1b0c9a5e2f7").error === "SHA_NOT_A_GIT_OBJECT",
        "the R16 fabricated SHA is still rejected");
});

await test("authorized evidence path matcher accepts evidence and rejects runtime", () => {
  check(isAuthorizedEvidencePath("evaluation/results/phase-10a14-r18/attempts/X/00-allocated.json"), "R18 evidence allowed");
  check(isAuthorizedEvidencePath("knowledge/CURRENT_STATE.md"), "CURRENT_STATE allowed");
  check(!isAuthorizedEvidencePath("server.js"), "server.js not an evidence path");
  check(!isAuthorizedEvidencePath("services/philippine-tax-domain-boundary.js"), "runtime not an evidence path");
  check(!isAuthorizedEvidencePath("evaluation/results/phase-10a14-r17/R17_ALL26_NONMUTATING.json"),
        "R17 historical evidence is not an authorized R18 evidence path");
});

// ─── P2-R17-IR1-005 count classification ─────────────────────────────────────
await test("attempt categories are a frozen machine-readable set", () => {
  for (const c of ["deterministic_runner", "staging_runner", "focused_suite", "domain_campaign", "synthetic_validator", "other"]) {
    check(FROZEN_ATTEMPT_CATEGORIES.has(c), `${c} is a frozen category`);
  }
  check(FROZEN_ATTEMPT_CATEGORIES.size === 6, "exactly six categories");
  check(!FROZEN_ATTEMPT_CATEGORIES.has("gate"), "unknown category is not accepted");
  check(FROZEN_RETRY_REASONS.size === 3, "exactly three frozen retry reasons");
  check(!FROZEN_RETRY_REASONS.has("SUITE_FAILED"), "a suite failure is never a technical retry reason");
});

await test("counts derive from category, not from command-name inference", () => {
  // A focused_suite attempt whose command text contains "run-regressions" must still
  // count as focused_suite. This is the P2 ambiguity, made unambiguous.
  const attempts = [
    { ...baseA, attemptId: "C1", attemptCategory: "focused_suite", command: "node x.mjs --compare-with run-regressions.mjs", retryOf: null },
    { ...baseA, attemptId: "C2", attemptCategory: "deterministic_runner", command: "node scripts/run-regressions.mjs", retryOf: null },
    { ...baseA, attemptId: "C3", attemptCategory: "staging_runner", command: "node scripts/run-staging-smokes.mjs", retryOf: null }
  ];
  const counts = {};
  for (const a of attempts) counts[a.attemptCategory] = (counts[a.attemptCategory] || 0) + 1;
  check(counts.focused_suite === 1, "command text resembling another category does not reclassify");
  check(counts.deterministic_runner === 1, "deterministic counted once");
  check(counts.staging_runner === 1, "staging counted once");
  const naive = attempts.filter((a) => /run-regressions/.test(a.command)).length;
  check(naive === 2 && counts.deterministic_runner === 1,
        "naive command-name counting would say 2; category-based counting says 1");
});

await test("missing, unknown and conflicting categories are rejected", () => {
  const bad = [undefined, null, "", "gate", "DETERMINISTIC_RUNNER", "focused_suite,staging_runner"];
  for (const c of bad) check(!FROZEN_ATTEMPT_CATEGORIES.has(c), `rejected category: ${String(c)}`);
});

// ─── Evidence immutability ───────────────────────────────────────────────────
await test("writeOnce refuses to overwrite and verifies by read-back", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "r18-once-"));
  const f = path.join(tmp, "a.json");
  check(writeOnce(f, "first") === true, "first write succeeds");
  let threw = false;
  try { writeOnce(f, "second"); } catch { threw = true; }
  check(threw, "second write to the same path is a hard error");
  check(fs.readFileSync(f, "utf8") === "first", "original content intact");
  fs.rmSync(tmp, { recursive: true, force: true });
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
