// PHASE-10A-CLOSURE-V1-CANONICAL-BYTES-1 - behavioral suite for
// evaluation/runner/phase10a-closure-v1/canonical-bytes.mjs.
//
// Covers the cross-platform hashing defect this work unit remediated: sealed
// digests in this repository are canonical (committed / LF) bytes, while a
// Windows checkout with core.autocrlf=true materializes CRLF, so a RAW
// working-tree hash of an unmodified file does not equal its sealed digest.
//
// Three kinds of coverage, deliberately:
//   1. Byte-level unit coverage of the canonicalization policy, including the
//      lone-CR case where the policy must NOT normalize.
//   2. AGREEMENT coverage against the sealed implementation
//      (commit5r1c13-lib.mjs normLf/sha256). Self-consistency is not enough --
//      if this helper drifted from the sealed convention it would produce
//      digests that disagree with every sealed manifest, so the suite asserts
//      equality with the sealed functions rather than with itself.
//   3. Real-git behavioral coverage in throwaway repositories under os.tmpdir()
//      that REPRODUCE the Windows CRLF checkout deterministically on any
//      platform, prove the raw-hash check genuinely fails there (the defect is
//      reproduced, not hidden), and prove the -text remediation fixes it.
//
// No network. No writes anywhere inside the governed working tree: every
// fixture repository is created under os.tmpdir() and removed in finally.
// The sealed harness is imported read-only; none of its writing functions are
// called.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import * as C from "../evaluation/runner/phase10a-closure-v1/canonical-bytes.mjs";
import * as SEALED from "../evaluation/runner/phase-10a14-r20/commit5r1c13-lib.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Sealed digest of the R20 harness itself, from
// evaluation/results/phase-10a14-r20/COMMIT_5R1C13_EVIDENCE_MANIFEST.sha256.
const SEALED_LIB_REL = "evaluation/runner/phase-10a14-r20/commit5r1c13-lib.mjs";
const SEALED_LIB_SHA = "d15db1c99f392f51dac27ec87490fcdcdcce7b6b4d068107875848f6f53e2c9a";
const R4_REL =
  "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r4/R20_DEVELOPMENT_ORACLE_FROZEN_R4.json";

let passed = 0, failed = 0, assertions = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }

// ---------------------------------------------------------------------------
// tmp git fixture plumbing
// ---------------------------------------------------------------------------

function git(root, args, allowFail = false, conf = []) {
  const r = spawnSync("git", [...conf, "-C", root, ...args], { maxBuffer: 1 << 26 });
  if (!allowFail && (r.error || r.status !== 0)) {
    const why = r.error ? r.error.message : (r.stderr || Buffer.alloc(0)).toString("utf8").trim();
    throw new Error("git " + args.join(" ") + " failed: " + why);
  }
  return { status: r.status, out: (r.stdout || Buffer.alloc(0)).toString("utf8") };
}

// Fixture configuration is injected with inline `-c` on every invocation rather
// than written into .git/config. Verified in this environment: `git config
// <key> <value>` exits 0 while writing nothing, so a fixture that relied on a
// config write would silently inherit the ambient system core.autocrlf=true and
// the CRLF scenarios would not be the scenarios they claim to be.
function withTmpRepo(autocrlf, fn) {
  const root = fs.mkdtempSync(path.join(tmpdir(), "p10a-canon-"));
  const conf = [
    "-c", `core.autocrlf=${autocrlf}`,
    "-c", "core.safecrlf=false",
    "-c", "user.email=fixture@example.invalid",
    "-c", "user.name=fixture",
    "-c", "commit.gpgsign=false"
  ];
  try {
    const init = spawnSync("git", ["-c", "init.defaultBranch=main", "init", "-q", root]);
    if (init.error || init.status !== 0) throw new Error("cannot init fixture repo");
    const g = (args, allowFail = false) => git(root, args, allowFail, conf);
    // The scenarios are only meaningful if the injected setting actually took.
    const effective = g(["config", "--get", "core.autocrlf"]).out.trim();
    if (effective !== String(autocrlf)) {
      throw new Error(`fixture core.autocrlf is ${effective}, expected ${autocrlf}`);
    }
    return fn(root, g);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const writeBytes = (root, rel, buf) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), buf);
};

// ---------------------------------------------------------------------------
// 1. canonicalization policy, byte level
// ---------------------------------------------------------------------------

const LF_TEXT = Buffer.from("a\nb\nc\n", "binary");
const CRLF_TEXT = Buffer.from("a\r\nb\r\nc\r\n", "binary");
const MIXED_TEXT = Buffer.from("a\r\nb\nc\r\n", "binary");
const LONE_CR_TEXT = Buffer.from("a\rb\rc\r", "binary");
const CR_THEN_CRLF = Buffer.from("a\r\r\nb", "binary");
const NO_TRAILING_NL = Buffer.from("{\"k\":1}", "binary");

test("normalizeToLf collapses CRLF to LF and is a no-op on LF", () => {
  check(C.normalizeToLf(CRLF_TEXT).equals(LF_TEXT), "CRLF normalizes to the LF bytes");
  check(C.normalizeToLf(LF_TEXT).equals(LF_TEXT), "LF input is unchanged");
  check(C.normalizeToLf(MIXED_TEXT).equals(LF_TEXT), "mixed input normalizes to the LF bytes");
});

test("normalizeToLf preserves a lone CR (policy: CRLF_TO_LF_ONLY)", () => {
  check(C.normalizeToLf(LONE_CR_TEXT).equals(LONE_CR_TEXT), "lone CR bytes survive normalization");
  check(C.countCr(C.normalizeToLf(LONE_CR_TEXT)) === 3, "all three lone CR bytes remain");
  // "a CR CR LF b" -> only the CR that is part of CRLF is consumed.
  check(
    C.normalizeToLf(CR_THEN_CRLF).equals(Buffer.from("a\r\nb", "binary")),
    "CR immediately preceding CRLF is preserved while the CRLF collapses"
  );
  check(C.CANONICAL_EOL_POLICY.loneCrPreserved === true, "policy documents lone-CR preservation");
  // The policy is a real constraint, not decoration: a CR->LF-everywhere
  // canonicalization would produce a different digest and disagree with git.
  const crToLfEverywhere = C.sha256(Buffer.from("a\nb\nc\n", "binary"));
  check(
    C.canonicalSha256(LONE_CR_TEXT) !== crToLfEverywhere,
    "lone-CR canonical digest must differ from a CR->LF-everywhere digest"
  );
});

test("countCr counts CR bytes exactly", () => {
  check(C.countCr(LF_TEXT) === 0, "LF text has no CR");
  check(C.countCr(CRLF_TEXT) === 3, "CRLF text has 3 CR");
  check(C.countCr(MIXED_TEXT) === 2, "mixed text has 2 CR");
  check(C.countCr(NO_TRAILING_NL) === 0, "single-line JSON has no CR");
});

test("canonical digest is EOL-independent while the raw digest is not", () => {
  check(
    C.canonicalSha256(CRLF_TEXT) === C.canonicalSha256(LF_TEXT),
    "CRLF and LF forms share one canonical digest"
  );
  check(
    C.canonicalSha256(MIXED_TEXT) === C.canonicalSha256(LF_TEXT),
    "mixed and LF forms share one canonical digest"
  );
  check(
    C.rawSha256(CRLF_TEXT) !== C.rawSha256(LF_TEXT),
    "raw digests genuinely differ -- this is the defect being remediated"
  );
  check(
    C.canonicalSha256(NO_TRAILING_NL) === C.rawSha256(NO_TRAILING_NL),
    "with no CR present canonical and raw agree (no trailing newline case)"
  );
});

// ---------------------------------------------------------------------------
// 2. agreement with the sealed implementation
// ---------------------------------------------------------------------------

test("canonicalization agrees byte-for-byte with the sealed normLf/sha256", () => {
  const fixtures = [
    ["lf", LF_TEXT], ["crlf", CRLF_TEXT], ["mixed", MIXED_TEXT],
    ["loneCr", LONE_CR_TEXT], ["crThenCrlf", CR_THEN_CRLF], ["noTrailingNl", NO_TRAILING_NL]
  ];
  for (const [label, buf] of fixtures) {
    check(
      C.normalizeToLf(buf).equals(SEALED.normLf(buf)),
      "normalizeToLf equals sealed normLf for " + label
    );
    check(
      C.canonicalSha256(buf) === SEALED.sha256(SEALED.normLf(buf)),
      "canonicalSha256 equals sealed sha256(normLf(...)) for " + label
    );
  }
});

test("canonicalization agrees with the sealed implementation on real oracle bytes", () => {
  const bytes = fs.readFileSync(path.join(REPO_ROOT, SEALED.R3_PATH));
  check(bytes.length > 6000000, "R3 oracle is the real multi-MB payload (" + bytes.length + " bytes)");
  check(
    C.canonicalSha256(bytes) === SEALED.sha256(SEALED.normLf(bytes)),
    "canonical digest of the real R3 oracle equals the sealed computation"
  );
  check(
    C.canonicalSha256(bytes) === SEALED.R3_SHA,
    "canonical digest of the real R3 oracle equals the sealed R3_SHA"
  );
});

// ---------------------------------------------------------------------------
// 3. real repository files
// ---------------------------------------------------------------------------

test("R3 oracle verifies EOL-independently against its sealed digest", () => {
  const r = C.verifyCanonicalIdentity({
    repoRoot: REPO_ROOT, relPath: SEALED.R3_PATH, expectedSha: SEALED.R3_SHA
  });
  check(r.verdict === C.VERDICTS.MATCH_EOL_INDEPENDENT, "verdict is MATCH_EOL_INDEPENDENT, got " + r.verdict);
  check(r.canonicalEqualsCommitted, "canonical bytes equal the committed blob");
  check(r.committedMatchesExpected, "the committed blob is what the sealed digest was taken over");
  check(r.byteLength > 6000000, "committedBlobSha256 handled a multi-MB blob without truncation");
  check(/^[0-9a-f]{64}$/.test(r.committedSha), "committed digest is a full sha256");
});

test("R3 oracle raw bytes equal the sealed digest (invariant loadR3 depends on)", () => {
  // loadR3() in the sealed harness hashes RAW working-tree bytes. The
  // evaluation/oracles/** -text rule is what makes that succeed on Windows.
  // If that rule is ever lost, this assertion fails first and names the cause.
  const raw = C.rawSha256(fs.readFileSync(path.join(REPO_ROOT, SEALED.R3_PATH)));
  check(
    raw === SEALED.R3_SHA,
    "raw R3 bytes must equal R3_SHA; got " + raw + ". Check the " +
      "evaluation/oracles/** -text rule in .gitattributes and re-materialize."
  );
});

test("R4 frozen oracle also matches its committed bytes canonically and raw", () => {
  const r = C.verifyCanonicalIdentity({ repoRoot: REPO_ROOT, relPath: R4_REL });
  check(r.canonicalEqualsCommitted, "R4 canonical bytes equal the committed blob");
  check(r.rawEqualsCommitted, "R4 raw bytes equal the committed blob under the -text rule");
  check(r.checkoutCrlf === false, "R4 is not CRLF-mangled in the working tree");
});

test("the sealed R20 harness matches its manifest digest EOL-independently", () => {
  const r = C.verifyCanonicalIdentity({
    repoRoot: REPO_ROOT, relPath: SEALED_LIB_REL, expectedSha: SEALED_LIB_SHA
  });
  check(r.verdict === C.VERDICTS.MATCH_EOL_INDEPENDENT, "verdict is MATCH_EOL_INDEPENDENT, got " + r.verdict);
  check(r.canonicalMatchesExpected, "the manifest sealed the canonical (committed) bytes");
  // Platform-independent invariant rather than a platform assertion: this file
  // carries no -text rule, so on a CRLF checkout raw must diverge and
  // checkoutCrlf must say so; on an LF checkout raw must agree.
  if (r.crCount > 0 && !r.rawEqualsCommitted) {
    check(r.checkoutCrlf === true, "a CRLF-materialized file must report checkoutCrlf");
    check(!r.rawMatchesExpected, "a raw hash of CRLF bytes must not match a canonical sealed digest");
  } else {
    check(r.rawEqualsCommitted, "on an LF checkout raw bytes equal the committed blob");
    check(r.checkoutCrlf === false, "no CRLF divergence to report");
  }
});

test("a genuine digest mismatch is reported, never silenced", () => {
  const bogus = "0".repeat(64);
  const r = C.verifyCanonicalIdentity({
    repoRoot: REPO_ROOT, relPath: SEALED.R3_PATH, expectedSha: bogus
  });
  check(r.verdict === C.VERDICTS.MISMATCH, "verdict is MISMATCH, got " + r.verdict);
  check(!r.canonicalMatchesExpected && !r.rawMatchesExpected, "no byte form matches a bogus digest");
  check(r.canonicalEqualsCommitted, "the file itself is still reported as undrifted from git");
  check(
    C.isCanonicallyIdentical({ repoRoot: REPO_ROOT, relPath: SEALED.R3_PATH, expectedSha: bogus }) === false,
    "isCanonicallyIdentical is false for a bogus digest"
  );
});

test("verifyCanonicalIdentity and committedBlobSha256 fail loudly on bad input", () => {
  assertions++;
  assert.throws(() => C.verifyCanonicalIdentity({ relPath: "x" }), /repoRoot/, "missing repoRoot throws");
  assertions++;
  assert.throws(() => C.verifyCanonicalIdentity({ repoRoot: REPO_ROOT }), /relPath/, "missing relPath throws");
  assertions++;
  assert.throws(
    () => C.committedBlobSha256(REPO_ROOT, "no/such/path/in/repo.json"),
    /cat-file blob/,
    "an untracked path throws instead of returning a digest"
  );
});

test("toGitPath yields forward-slashed repo-relative paths", () => {
  check(C.toGitPath(["a", "b", "c.json"].join(path.sep)) === "a/b/c.json", "separators normalized");
  check(C.toGitPath("./a/b.json") === "a/b.json", "leading ./ removed");
  check(C.toGitPath("a/b.json") === "a/b.json", "already-canonical path unchanged");
});

// ---------------------------------------------------------------------------
// 4. real-git behavioral coverage: reproduce Windows, then prove the fix
// ---------------------------------------------------------------------------

test("WINDOWS REPRODUCTION: autocrlf=true checkout breaks a raw-byte hash check", () => {
  withTmpRepo("true", (root, g) => {
    const rel = "data/oracle.json";
    writeBytes(root, rel, LF_TEXT);
    const lfDigest = C.sha256(LF_TEXT); // the digest a manifest would seal
    g(["add", "-A"]);
    g(["commit", "-q", "-m", "seal LF bytes"]);

    // Re-materialize exactly as a fresh Windows clone/checkout would.
    fs.rmSync(path.join(root, rel));
    g(["checkout", "--", "."]);

    const worktree = fs.readFileSync(path.join(root, rel));
    check(C.countCr(worktree) > 0, "autocrlf=true materialized CRLF in the working tree");
    check(
      C.rawSha256(worktree) !== lfDigest,
      "a RAW hash of the checked-out bytes does NOT match the sealed digest -- defect reproduced"
    );
    // Content-level, not `status --porcelain`: a fresh checkout leaves a stale
    // stat cache, so status reports " M" for a file whose content git itself
    // considers unchanged. hash-object applies the same filters git uses.
    g(["update-index", "--refresh"], true);
    check(g(["diff", "--name-only"]).out.trim() === "", "git reports no content change");
    check(
      g(["hash-object", "--", path.join(root, rel)]).out.trim() === g(["rev-parse", ":" + rel]).out.trim(),
      "the filtered worktree object id equals the staged object id"
    );

    const r = C.verifyCanonicalIdentity({ repoRoot: root, relPath: rel, expectedSha: lfDigest });
    check(r.checkoutCrlf === true, "checkoutCrlf reports the EOL divergence explicitly");
    check(r.rawEqualsCommitted === false, "raw bytes differ from the committed blob");
    check(r.canonicalEqualsCommitted === true, "canonical bytes equal the committed blob");
    check(r.verdict === C.VERDICTS.MATCH_EOL_INDEPENDENT, "canonical verification still succeeds");
    check(r.committedSha === lfDigest, "the committed blob is the sealed LF bytes");
  });
});

test("REMEDIATION: a -text attribute makes the raw-byte hash check succeed", () => {
  withTmpRepo("true", (root, g) => {
    const rel = "data/oracle.json";
    writeBytes(root, rel, LF_TEXT);
    writeBytes(root, ".gitattributes", Buffer.from("data/** -text\n", "binary"));
    const lfDigest = C.sha256(LF_TEXT);
    g(["add", "-A"]);
    g(["commit", "-q", "-m", "seal LF bytes with -text"]);

    fs.rmSync(path.join(root, rel));
    g(["checkout", "--", "."]);

    const worktree = fs.readFileSync(path.join(root, rel));
    check(C.countCr(worktree) === 0, "-text prevented CRLF materialization under autocrlf=true");
    check(
      C.rawSha256(worktree) === lfDigest,
      "a RAW hash of the checked-out bytes now matches the sealed digest -- this is the fix"
    );
    const r = C.verifyCanonicalIdentity({ repoRoot: root, relPath: rel, expectedSha: lfDigest });
    check(r.checkoutCrlf === false, "no EOL divergence remains to report");
    check(r.rawEqualsCommitted && r.canonicalEqualsCommitted, "raw and canonical both equal the committed blob");
    check(r.verdict === C.VERDICTS.MATCH_EOL_INDEPENDENT, "verification succeeds EOL-independently");
  });
});

test("MATCH_RAW_ONLY: a digest sealed over committed CRLF bytes is distinguished", () => {
  withTmpRepo("false", (root, g) => {
    const rel = "data/crlf-sealed.txt";
    writeBytes(root, rel, CRLF_TEXT);
    g(["add", "-A"]);
    g(["commit", "-q", "-m", "commit CRLF bytes verbatim"]);

    const rawDigest = C.sha256(CRLF_TEXT);
    const r = C.verifyCanonicalIdentity({ repoRoot: root, relPath: rel, expectedSha: rawDigest });
    check(r.committedSha === rawDigest, "the blob really does hold CRLF bytes");
    check(r.verdict === C.VERDICTS.MATCH_RAW_ONLY, "verdict is MATCH_RAW_ONLY, got " + r.verdict);
    check(r.canonicalEqualsCommitted === false, "canonical form differs from the committed CRLF blob");
    check(r.checkoutCrlf === false, "raw equals committed, so this is not a checkout artifact");
    check(
      C.isCanonicallyIdentical({ repoRoot: root, relPath: rel, expectedSha: rawDigest }) === false,
      "a raw-only match is not reported as a canonical match"
    );
  });
});

// ---------------------------------------------------------------------------
// 5. repository-level guard on the applied remediation
// ---------------------------------------------------------------------------

test("every tracked oracle file is materialized as its committed bytes", () => {
  const attrs = fs.readFileSync(path.join(REPO_ROOT, ".gitattributes"), "utf8");
  check(
    /^evaluation\/oracles\/\*\* +-text$/m.test(attrs),
    ".gitattributes carries the evaluation/oracles/** -text rule"
  );
  const rows = git(REPO_ROOT, ["ls-files", "--eol", "evaluation/oracles"]).out
    .split("\n").map((l) => l.trim()).filter(Boolean);
  check(rows.length >= 90, "the oracle corpus is present (" + rows.length + " tracked files)");
  const bad = rows.filter((l) => /^i\/\S+\s+w\/(crlf|mixed)\b/.test(l));
  check(bad.length === 0, "no oracle file may be CRLF/mixed in the working tree; offenders: " + bad.length);
  const untexted = rows.filter((l) => !/attr\/-text\b/.test(l));
  check(untexted.length === 0, "every oracle file must carry -text; missing on " + untexted.length);
});

console.log(
  "\nPHASE-10A-CLOSURE-V1-CANONICAL-BYTES-1 tests: " + passed + " passed, " + failed + " failed, " +
    assertions + " assertions"
);
process.exitCode = failed > 0 ? 1 : 0;
