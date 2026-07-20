// PHASE-10A14-R17 — provenance, recovery-disposition and retry-link validators.
//
// Implements the contract frozen and pushed at COMMIT 1 (6414f98f), before this file
// existed. Closes three R16 gaps:
//
//   P1-R16-IR-006  R16 validated internal consistency and file hashes but never asked Git
//                  whether a recorded SHA was real. A fabricated SHA sat in 11 attempts
//                  while the registry reported integrity.clean: true.
//   P1-R16-IR-004  R16 derived status from the terminal filename alone and never read the
//                  recovery adjudication, so an attempt adjudicated invalid was still
//                  counted a controlling pass. It also equated "malformed" with
//                  "unparseable JSON", so a NUL-filled text file was invisible.
//   P1-R16-IR-005  R16 reported retries: 0 with every retryOf null while describing two
//                  attempts as retries and claiming a ceiling was reached.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export const REPO = "C:/Projects/tina-backend";

// ─────────────────────────────────────────────────────────────────────────────
// 1. GIT-DERIVED PROVENANCE
// ─────────────────────────────────────────────────────────────────────────────

const SHA_RE = /^[0-9a-f]{40}$/;
const provenanceCache = new Map();

/** Ask Git the object type. No `^{commit}` — cmd.exe eats the caret on Windows. */
function gitObjectType(sha, cwd = REPO) {
  try {
    return execSync(`git cat-file -t ${sha}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function gitIsAncestor(ancestor, descendant, cwd = REPO) {
  try {
    execSync(`git merge-base --is-ancestor ${ancestor} ${descendant}`, { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a single SHA against Git itself.
 * @returns {{sha:string, valid:boolean, errors:string[], objectType:string|null, exists:boolean}}
 */
export function validateSha(sha, { expectedAncestorOf = null, cwd = REPO } = {}) {
  const key = `${sha}|${expectedAncestorOf || ""}`;
  if (provenanceCache.has(key)) return provenanceCache.get(key);

  const errors = [];
  const out = { sha, valid: false, errors, objectType: null, exists: false };

  if (typeof sha !== "string" || sha.length === 0) {
    errors.push("SHA_ABSENT");
    provenanceCache.set(key, out);
    return out;
  }
  if (!SHA_RE.test(sha)) errors.push("SHA_FORMAT_INVALID");

  const type = SHA_RE.test(sha) ? gitObjectType(sha, cwd) : null;
  out.objectType = type;
  out.exists = type !== null;

  if (SHA_RE.test(sha) && type === null) errors.push("SHA_NOT_A_GIT_OBJECT");
  if (type !== null && type !== "commit") errors.push(`SHA_WRONG_OBJECT_TYPE:${type}`);

  if (expectedAncestorOf && type === "commit") {
    if (!gitIsAncestor(sha, expectedAncestorOf, cwd)) errors.push("ANCESTRY_INVALID");
  }

  out.valid = errors.length === 0;
  provenanceCache.set(key, out);
  return out;
}

/** Validate every provenance-bearing field on an attempt record. */
export function validateAttemptProvenance(rec, { expectedAncestorOf = null, cwd = REPO } = {}) {
  const errors = [];
  const check = (label, sha, requireAncestry) => {
    if (sha == null) return null;                 // absent is not false
    const r = validateSha(sha, { expectedAncestorOf: requireAncestry ? expectedAncestorOf : null, cwd });
    if (!r.valid) errors.push(`${label}:${r.errors.join(",")}`);
    return r.valid;
  };

  const headAtStartVerified = check("headAtStart", rec.headAtStart, false);
  const headAtEndVerified = check("headAtEnd", rec.headAtEnd, false);
  const runtimeCommitVerified = check("runtimeCommit", rec.runtimeCommit, Boolean(expectedAncestorOf));
  const ancestryVerified = expectedAncestorOf && rec.runtimeCommit
    ? !errors.some((e) => e.startsWith("runtimeCommit") && e.includes("ANCESTRY_INVALID"))
    : null;

  return {
    provenanceValid: errors.length === 0,
    provenanceErrors: errors,
    headAtStartVerified, headAtEndVerified, runtimeCommitVerified, ancestryVerified,
    treeEquivalenceVerified: rec.treeEquivalenceClaimed === true ? rec.treeEquivalenceVerified === true : null
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RECOVERY DISPOSITION
// ─────────────────────────────────────────────────────────────────────────────

export const DISPOSITIONS = Object.freeze({
  VALID_CONTROLLING: "VALID_CONTROLLING",
  VALID_NON_CONTROLLING: "VALID_NON_CONTROLLING",
  INVALID_PARTIAL_IMPORT: "INVALID_PARTIAL_IMPORT",
  CORRUPTED_EVIDENCE: "CORRUPTED_EVIDENCE",
  INVALID_PROVENANCE: "INVALID_PROVENANCE",
  SUPERSEDED_TECHNICAL_ATTEMPT: "SUPERSEDED_TECHNICAL_ATTEMPT",
  UNADJUDICATED: "UNADJUDICATED"
});

const NON_CONTROLLING = new Set([
  DISPOSITIONS.VALID_NON_CONTROLLING, DISPOSITIONS.INVALID_PARTIAL_IMPORT,
  DISPOSITIONS.CORRUPTED_EVIDENCE, DISPOSITIONS.INVALID_PROVENANCE,
  DISPOSITIONS.SUPERSEDED_TECHNICAL_ATTEMPT
]);

/**
 * Detect corruption in an evidence file. Deliberately NOT a JSON-parse check: the R16
 * corrupted file was `tree-before.txt`, 186 NUL bytes, which no JSON check could see.
 */
/**
 * Files that may legitimately be empty or whitespace-only:
 *   - *.raw.txt      a process that produced no stderr must still yield a valid file;
 *   - tree-*.txt     a clean tracked tree produces no porcelain output.
 * NUL bytes remain corrupt in EVERY file, which is what catches the R16 case.
 */
const MAY_BE_EMPTY = (name) => /\.raw\.txt$/.test(name) || /^tree-(before|after)\.txt$/.test(name);

export function detectCorruption(filePath) {
  if (!fs.existsSync(filePath)) return { corrupt: true, reason: "MISSING" };
  const buf = fs.readFileSync(filePath);
  // NUL bytes are corrupt everywhere, with no exemption. This is the rule that catches
  // the R16 tree-before.txt of 186 NUL bytes.
  if (buf.includes(0)) return { corrupt: true, reason: "CONTAINS_NUL_BYTES" };
  const name = path.basename(filePath);
  const emptyAllowed = MAY_BE_EMPTY(name);
  if (buf.length === 0) {
    return emptyAllowed ? { corrupt: false, reason: null } : { corrupt: true, reason: "ZERO_LENGTH" };
  }
  const text = buf.toString("utf8");
  if (text.trim().length === 0 && !emptyAllowed) return { corrupt: true, reason: "ALL_WHITESPACE" };
  if (filePath.endsWith(".json")) {
    try { JSON.parse(text); } catch { return { corrupt: true, reason: "MALFORMED_JSON" }; }
  }
  return { corrupt: false, reason: null };
}

/** Scan an attempt directory for corrupt evidence files. */
export function scanAttemptCorruption(dir) {
  const findings = [];
  if (!fs.existsSync(dir)) return { corrupt: true, findings: [{ file: dir, reason: "MISSING_DIRECTORY" }] };
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) continue;
    const r = detectCorruption(full);
    if (r.corrupt) findings.push({ file: name, reason: r.reason });
  }
  return { corrupt: findings.length > 0, findings };
}

/** Read a recovery adjudication if present. */
export function readAdjudication(dir) {
  const p = path.join(dir, "40-recovery-adjudication.json");
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return { __malformed: true }; }
}

/**
 * Determine the authoritative disposition. Precedence, in order:
 *   1. corrupt evidence
 *   2. invalid provenance
 *   3. explicit recovery adjudication
 *   4. raw terminal status
 */
export function resolveDisposition({ dir, rawStatus, provenanceValid, adjudication = undefined, corruption = undefined }) {
  const corrupt = corruption ?? scanAttemptCorruption(dir);
  const adj = adjudication !== undefined ? adjudication : readAdjudication(dir);
  const reasons = [];

  if (corrupt.corrupt) {
    reasons.push(`CORRUPT:${corrupt.findings.map((f) => `${f.file}=${f.reason}`).join(";")}`);
    return { disposition: DISPOSITIONS.CORRUPTED_EVIDENCE, controlling: false, reasons, adjudication: adj };
  }
  if (provenanceValid === false) {
    reasons.push("PROVENANCE_INVALID");
    return { disposition: DISPOSITIONS.INVALID_PROVENANCE, controlling: false, reasons, adjudication: adj };
  }
  if (adj && !adj.__malformed) {
    const stated = String(adj.disposition || "").toUpperCase();
    reasons.push(`ADJUDICATED:${stated || "UNSPECIFIED"}`);
    // An adjudication that says non-controlling is authoritative over rawStatus.
    if (/NON_CONTROLLING|INVALID|CORRUPT|SUPERSEDED/.test(stated)) {
      const mapped = /PARTIAL/.test(stated) ? DISPOSITIONS.INVALID_PARTIAL_IMPORT
        : /CORRUPT/.test(stated) ? DISPOSITIONS.CORRUPTED_EVIDENCE
        : /PROVENANCE/.test(stated) ? DISPOSITIONS.INVALID_PROVENANCE
        : /SUPERSEDED/.test(stated) ? DISPOSITIONS.SUPERSEDED_TECHNICAL_ATTEMPT
        : DISPOSITIONS.VALID_NON_CONTROLLING;
      return { disposition: mapped, controlling: false, reasons, adjudication: adj };
    }
  }
  if (adj && adj.__malformed) {
    reasons.push("ADJUDICATION_MALFORMED");
    return { disposition: DISPOSITIONS.CORRUPTED_EVIDENCE, controlling: false, reasons, adjudication: adj };
  }

  const controlling = rawStatus === "COMPLETED_PASS";
  reasons.push(`RAW:${rawStatus}`);
  return {
    disposition: controlling ? DISPOSITIONS.VALID_CONTROLLING : DISPOSITIONS.VALID_NON_CONTROLLING,
    controlling, reasons, adjudication: adj
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RETRY LINKAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate retry links across a set of attempt records.
 * An unlinked rerun is NOT a retry and never counts toward a ceiling.
 */
export function validateRetryLinks(records) {
  const byId = new Map(records.map((r) => [r.attemptId, r]));
  const errors = [];
  const validRetries = [];

  for (const r of records) {
    if (r.retryOf == null) continue;             // not claiming to be a retry
    const target = byId.get(r.retryOf);
    if (!target) { errors.push({ attemptId: r.attemptId, error: "RETRY_TARGET_MISSING", retryOf: r.retryOf }); continue; }
    if (r.retryOf === r.attemptId) { errors.push({ attemptId: r.attemptId, error: "RETRY_SELF_LINK" }); continue; }
    if (!r.retryReason) errors.push({ attemptId: r.attemptId, error: "RETRY_REASON_ABSENT" });
    if (r.runtimeCommit && target.runtimeCommit && r.runtimeCommit !== target.runtimeCommit) {
      errors.push({ attemptId: r.attemptId, error: "RETRY_RUNTIME_CHANGED", from: target.runtimeCommit, to: r.runtimeCommit });
      continue;
    }
    validRetries.push({ attemptId: r.attemptId, retryOf: r.retryOf, reason: r.retryReason ?? null });
  }

  // Cycle detection over the retry graph.
  const cycles = [];
  for (const r of records) {
    if (r.retryOf == null) continue;
    const seen = new Set([r.attemptId]);
    let cur = byId.get(r.retryOf);
    while (cur && cur.retryOf != null) {
      if (seen.has(cur.attemptId)) { cycles.push(r.attemptId); break; }
      seen.add(cur.attemptId);
      cur = byId.get(cur.retryOf);
    }
  }
  for (const c of cycles) errors.push({ attemptId: c, error: "RETRY_CYCLE" });

  const cycleIds = new Set(cycles);
  const linked = validRetries.filter((v) => !cycleIds.has(v.attemptId));

  return {
    validRetries: linked,
    validRetryCount: linked.length,
    errors,
    valid: errors.length === 0,
    unlinkedRerunNote: "An attempt with retryOf null is an unlinked rerun. It is not a retry and does not count toward any ceiling."
  };
}

/** Retry ceiling per (cycleKey, runtimeCommit), computed ONLY from valid links. */
export function computeRetryCeiling(records, { maxRetries = 2 } = {}) {
  const { validRetries } = validateRetryLinks(records);
  const linkedIds = new Set(validRetries.map((v) => v.attemptId));
  const groups = {};
  for (const r of records) {
    const key = `${r.cycleKey || r.probeId || r.attemptType}|${r.runtimeCommit || "UNKNOWN"}`;
    (groups[key] ||= { key, attempts: 0, linkedRetries: 0, unlinkedReruns: 0 });
    groups[key].attempts++;
    if (linkedIds.has(r.attemptId)) groups[key].linkedRetries++;
    else if (r.retryOf == null && groups[key].attempts > 1) groups[key].unlinkedReruns++;
  }
  for (const g of Object.values(groups)) {
    g.maxRetries = maxRetries;
    g.ceilingReached = g.linkedRetries >= maxRetries;
    g.ceilingSupportedByLinks = g.linkedRetries > 0 || g.attempts === 1;
  }
  return groups;
}

export default {
  validateSha, validateAttemptProvenance,
  detectCorruption, scanAttemptCorruption, readAdjudication, resolveDisposition, DISPOSITIONS,
  validateRetryLinks, computeRetryCeiling
};
