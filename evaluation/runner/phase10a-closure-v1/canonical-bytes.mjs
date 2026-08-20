// PHASE-10A-CLOSURE-V1 - canonical committed-bytes verification helper.
//
// WHY THIS EXISTS
// ---------------
// Hash-bound evidence in this repository is sealed against CANONICAL bytes:
// every digest in COMMIT_5R1C13_EVIDENCE_MANIFEST.sha256 equals the committed
// git blob, which equals the LF-normalized working-tree bytes. On a Windows
// checkout with core.autocrlf=true the working tree holds CRLF, so a RAW
// working-tree hash of the same file differs from its sealed digest even though
// the file is unmodified (git diff empty). Verifying raw bytes is therefore not
// EOL-independent, and a harness that does so fails on Windows for a reason
// that has nothing to do with evidence drift.
//
// This module provides the EOL-independent verification the closure work needs,
// additively. It does not modify, wrap, or re-seal any existing harness. In
// particular evaluation/runner/phase-10a14-r20/commit5r1c13-lib.mjs is itself
// hash-sealed and is NOT touched by this file.
//
// CANONICALIZATION IS DELIBERATELY IDENTICAL TO THE SEALED CONVENTION
// ------------------------------------------------------------------
// normalizeToLf() collapses CRLF to LF and leaves a LONE CR byte intact. That
// is exactly what git's text conversion does on commit, and exactly what the
// sealed harness's normLf() does. Converting lone CR would produce digests that
// disagree with both, so it is not done here. See the behavioral suite
// tests/phase10a-closure-v1-canonical-bytes-1.test.mjs, which asserts agreement
// against the sealed implementation rather than only against itself.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Oracle payloads run to several MB; the spawnSync default would truncate them.
const GIT_MAX_BUFFER = 1 << 28; // 256 MiB

export const CANONICAL_EOL_POLICY = Object.freeze({
  policy: "CRLF_TO_LF_ONLY",
  loneCrPreserved: true,
  rationale:
    "Matches git text conversion and the sealed normLf() in " +
    "evaluation/runner/phase-10a14-r20/commit5r1c13-lib.mjs. Any other policy " +
    "would produce digests that disagree with the sealed manifests."
});

export const VERDICTS = Object.freeze({
  MATCH_EOL_INDEPENDENT: "MATCH_EOL_INDEPENDENT",
  MATCH_RAW_ONLY: "MATCH_RAW_ONLY",
  MISMATCH: "MISMATCH"
});

export function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** CRLF -> LF. Lone CR is preserved (see CANONICAL_EOL_POLICY). */
export function normalizeToLf(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return Buffer.from(b.toString("binary").replace(/\r\n/g, "\n"), "binary");
}

export function rawSha256(buf) {
  return sha256(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
}

export function canonicalSha256(buf) {
  return sha256(normalizeToLf(buf));
}

export function countCr(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  let n = 0;
  for (let i = 0; i < b.length; i++) if (b[i] === 13) n++;
  return n;
}

/**
 * SHA-256 of the bytes git actually has committed for relPath at ref.
 * This is the authority a sealed digest was computed against, and it is
 * unaffected by how the file was materialized into the working tree.
 */
export function committedBlobSha256(repoRoot, relPath, ref = "HEAD") {
  const spec = `${ref}:${toGitPath(relPath)}`;
  const r = spawnSync("git", ["-C", repoRoot, "cat-file", "blob", spec], {
    maxBuffer: GIT_MAX_BUFFER
  });
  if (r.error) throw new Error(`git unavailable: ${r.error.message}`);
  if (r.status !== 0) {
    const err = (r.stderr && r.stderr.toString("utf8").trim()) || `exit ${r.status}`;
    throw new Error(`git cat-file blob ${spec} failed: ${err}`);
  }
  return sha256(r.stdout);
}

/** Repo-relative, forward-slashed path as git names it. */
export function toGitPath(relPath) {
  return relPath.split(path.sep).join("/").replace(/^\.\//, "");
}

/**
 * Full EOL-independent identity report for one tracked file.
 *
 * expectedSha is optional; when supplied it is compared against all three byte
 * forms so the caller can tell "sealed against canonical bytes" (the repository
 * convention) apart from "sealed against raw bytes" and from real drift.
 *
 * Nothing here silences a mismatch: a canonical-digest mismatch is reported as
 * MISMATCH, and checkoutCrlf is surfaced as an explicit fact rather than used
 * to excuse a failure.
 */
export function verifyCanonicalIdentity({ repoRoot, relPath, expectedSha = null, ref = "HEAD" }) {
  if (!repoRoot) throw new Error("verifyCanonicalIdentity requires repoRoot");
  if (!relPath) throw new Error("verifyCanonicalIdentity requires relPath");
  const abs = path.isAbsolute(relPath) ? relPath : path.join(repoRoot, relPath);
  const bytes = fs.readFileSync(abs);

  const raw = rawSha256(bytes);
  const canonical = canonicalSha256(bytes);
  const committed = committedBlobSha256(repoRoot, relPath, ref);

  const crCount = countCr(bytes);
  const checkoutCrlf = raw !== committed && canonical === committed;

  const rawMatchesExpected = expectedSha !== null && raw === expectedSha;
  const canonicalMatchesExpected = expectedSha !== null && canonical === expectedSha;
  const committedMatchesExpected = expectedSha !== null && committed === expectedSha;

  let verdict = null;
  if (expectedSha !== null) {
    if (canonicalMatchesExpected) verdict = VERDICTS.MATCH_EOL_INDEPENDENT;
    else if (rawMatchesExpected) verdict = VERDICTS.MATCH_RAW_ONLY;
    else verdict = VERDICTS.MISMATCH;
  }

  return Object.freeze({
    relPath: toGitPath(relPath),
    ref,
    byteLength: bytes.length,
    crCount,
    checkoutCrlf,
    rawSha: raw,
    canonicalSha: canonical,
    committedSha: committed,
    expectedSha,
    canonicalEqualsCommitted: canonical === committed,
    rawEqualsCommitted: raw === committed,
    rawMatchesExpected,
    canonicalMatchesExpected,
    committedMatchesExpected,
    verdict
  });
}

/** Convenience: true only for an EOL-independent canonical match. */
export function isCanonicallyIdentical(args) {
  return verifyCanonicalIdentity(args).verdict === VERDICTS.MATCH_EOL_INDEPENDENT;
}
