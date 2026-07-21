// PHASE-10A14-R18 — runtime / harness / environment identity (P1-R17-IR1-001).
//
// The R17 defect: repository HEAD was stored as runtimeCommit. Committing each failed
// attempt — which the immutable-evidence sequence REQUIRES — moved HEAD, so byte-identical
// runtime was reported as RETRY_RUNTIME_CHANGED. HEAD is evidence identity, not runtime
// identity. This module separates the four identities.
//
// PROSPECTIVE ONLY: applies to R18 and later. It does not retroactively validate R17
// A2/A3, and R17 remains NOT SATISFIED.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const R18_DIR = "evaluation/results/phase-10a14-r18";

const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/** Load a frozen scope manifest (sorted, explicit file list). */
export function loadManifest(manifestPath) {
  const raw = fs.readFileSync(manifestPath, "utf8");
  const m = JSON.parse(raw);
  if (!Array.isArray(m.files) || m.files.length === 0) {
    throw new Error(`scope manifest has no files: ${manifestPath}`);
  }
  const sorted = [...m.files].sort();
  if (JSON.stringify(sorted) !== JSON.stringify(m.files)) {
    throw new Error(`scope manifest is not sorted: ${manifestPath}`);
  }
  if (new Set(m.files).size !== m.files.length) {
    throw new Error(`scope manifest has duplicates: ${manifestPath}`);
  }
  return { manifest: m, manifestSha256: sha256(raw) };
}

/**
 * Tree digest over a frozen manifest.
 *
 * sha256 over "path\n<sha256 of file bytes>\n" for every entry in sorted path order.
 * Independently recomputable from the working tree alone, with no Git dependency.
 *
 * A MISSING FILE IS A HARD ERROR, never a skipped entry — otherwise deleting a runtime
 * file would leave the digest unchanged, which is the whole property being asserted.
 */
export function treeDigest(manifestPath) {
  const { manifest, manifestSha256 } = loadManifest(manifestPath);
  const h = crypto.createHash("sha256");
  const perFile = [];
  for (const f of manifest.files) {
    if (!fs.existsSync(f)) throw new Error(`scope manifest file missing: ${f}`);
    const fileSha = sha256(fs.readFileSync(f));
    h.update(`${f}\n${fileSha}\n`);
    perFile.push({ file: f, sha256: fileSha });
  }
  return { digest: h.digest("hex"), filesCount: manifest.files.length, manifestSha256, perFile };
}

/** Environment fingerprint. Deliberately records no environment VALUES (no secrets). */
export function environmentFingerprint() {
  const nodeVersion = process.version;
  const platform = process.platform;
  const architecture = process.arch;
  return {
    nodeVersion, platform, architecture,
    fingerprint: sha256(`${nodeVersion}|${platform}|${architecture}`)
  };
}

export function dependencyLockDigest() {
  return sha256(fs.readFileSync("package-lock.json"));
}

/** Validate a SHA against Git itself: format, existence, object type commit, ancestry. */
export function validateGitCommit(sha) {
  if (!/^[0-9a-f]{7,40}$/i.test(String(sha || ""))) return { valid: false, error: "SHA_MALFORMED" };
  let type;
  try {
    type = git(["cat-file", "-t", sha]);
  } catch {
    return { valid: false, error: "SHA_NOT_A_GIT_OBJECT" };
  }
  if (type !== "commit") return { valid: false, error: "SHA_NOT_A_COMMIT" };
  try {
    git(["merge-base", "--is-ancestor", sha, "HEAD"]);
  } catch {
    return { valid: false, error: "SHA_NOT_ANCESTOR_OF_HEAD" };
  }
  return { valid: true, resolved: git(["rev-parse", sha]) };
}

/** Files changed between two evidence commits. */
export function changedFilesBetween(fromSha, toSha) {
  if (fromSha === toSha) return [];
  return git(["diff", "--name-only", fromSha, toSha]).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Authorized evidence/report paths. Evidence HEAD may move between a retry and its target
 * ONLY because paths in this set were committed. Anything else invalidates the link — that
 * is what makes permitting evidence-HEAD movement safe rather than merely tolerated.
 */
export const AUTHORIZED_EVIDENCE_PATHS = [
  /^evaluation\/results\/phase-10a14-r18\//,
  /^evaluation\/results\/phase-10a14-r18-result\.json$/,
  /^PHASE-10A14-R18-[A-Z0-9-]+_REPORT\.md$/,
  /^knowledge\/CURRENT_STATE\.md$/
];

export const isAuthorizedEvidencePath = (p) => AUTHORIZED_EVIDENCE_PATHS.some((re) => re.test(p));

export const FROZEN_ATTEMPT_CATEGORIES = new Set([
  "deterministic_runner", "staging_runner", "focused_suite",
  "domain_campaign", "synthetic_validator", "other"
]);

export const FROZEN_RETRY_REASONS = new Set([
  "TECHNICAL_TRANSPORT_ERROR", "TECHNICAL_ENVIRONMENT_ERROR", "TECHNICAL_RESOURCE_ERROR"
]);

/**
 * Allocate a governed attempt. Every identity field is COMPUTED HERE — no caller may
 * supply a digest, a baseline commit or any Git SHA. Caller-supplied identity is the
 * forgery vector the retry validator's negative controls 12 and 13 exercise.
 */
export function allocateAttempt(opts) {
  const {
    attemptId, attemptType, attemptCategory, gateName, cycle, attemptOrdinal,
    retryOf = null, retryReason = null, command,
    runtimeManifestPath = `${R18_DIR}/RUNTIME_SCOPE_MANIFEST.json`,
    harnessManifestPath = `${R18_DIR}/HARNESS_SCOPE_MANIFEST.json`,
    attemptsDir = `${R18_DIR}/attempts`
  } = opts;

  for (const forged of ["runtimeTreeDigest", "harnessTreeDigest", "runtimeBaselineCommit",
                        "evidenceHeadAtAllocation", "dependencyLockDigest", "environmentFingerprint"]) {
    if (forged in opts) throw new Error(`caller may not supply identity field: ${forged}`);
  }
  if (!FROZEN_ATTEMPT_CATEGORIES.has(attemptCategory)) {
    throw new Error(`unknown attemptCategory: ${attemptCategory}`);
  }
  if (retryOf !== null && !FROZEN_RETRY_REASONS.has(retryReason)) {
    throw new Error(`retry requires a frozen retryReason, got: ${retryReason}`);
  }

  const dir = path.join(attemptsDir, attemptId);
  fs.mkdirSync(attemptsDir, { recursive: true }); // parent only
  fs.mkdirSync(dir, { recursive: false }); // exclusive: an existing attemptId is a hard error
  const rt = treeDigest(runtimeManifestPath);
  const hn = treeDigest(harnessManifestPath);
  const env = environmentFingerprint();

  const record = {
    attemptId, attemptType, attemptCategory, gateName, cycle, attemptOrdinal,
    retryOf, retryReason,
    evidenceHeadAtAllocation: git(["rev-parse", "HEAD"]),
    evidenceHeadAtStart: null, evidenceHeadAtEnd: null,
    runtimeBaselineCommit: git(["rev-parse", "HEAD"]),
    runtimeScopeManifestPath: runtimeManifestPath,
    runtimeScopeManifestSha256: rt.manifestSha256,
    runtimeTreeDigest: rt.digest, runtimeFilesCount: rt.filesCount,
    harnessScopeManifestPath: harnessManifestPath,
    harnessScopeManifestSha256: hn.manifestSha256,
    harnessTreeDigest: hn.digest, harnessFilesCount: hn.filesCount,
    dependencyLockDigest: dependencyLockDigest(),
    nodeVersion: env.nodeVersion, platform: env.platform, architecture: env.architecture,
    environmentFingerprint: env.fingerprint,
    command, startedAt: null, endedAt: null,
    exitCode: null, signal: null, status: "ALLOCATED",
    disposition: null, controlling: false
  };
  writeOnce(path.join(dir, "00-allocated.json"), JSON.stringify(record, null, 2) + "\n");
  return { dir, record };
}

/** Write once, fsync, read back and byte-compare. A second write to a path is a hard error. */
export function writeOnce(file, contents) {
  if (fs.existsSync(file)) throw new Error(`evidence file already exists, refusing to overwrite: ${file}`);
  const fd = fs.openSync(file, "wx");
  try {
    fs.writeFileSync(fd, contents);
    try { fs.fsyncSync(fd); } catch { /* fsync unsupported on this fs */ }
  } finally {
    fs.closeSync(fd);
  }
  const back = fs.readFileSync(file, "utf8");
  if (back !== contents) throw new Error(`read-back verification failed: ${file}`);
  return true;
}

export { git, sha256 };
