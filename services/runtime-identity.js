// FILE: services/runtime-identity.js
// PHASE-10A14-R15 (P2-R14-IR-009) — exact staging runtime identity.
//
// R14 proved the deployed runtime by behavioural fingerprint: it observed that a field
// only R14 emits was present. That shows SOME build containing the change is live; it
// cannot identify WHICH commit, and cannot distinguish the final runtime from any later
// build carrying the same field.
//
// This module reports the commit SHA baked in at build time so a campaign can prove the
// exact runtime before and after execution.
//
// EXPOSURE LIMITS: only the commit SHA, deployment id and service name are ever exposed.
// No other environment value, no secret, no route inventory, no internal path, no
// credential and no build token. A value is never guessed: unknown resolves to null.
"use strict";

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SHA_RE = /^[0-9a-f]{40}$/i;
const normalize = (v) => (typeof v === "string" && SHA_RE.test(v.trim()) ? v.trim().toLowerCase() : null);

let cached = null;

/**
 * Resolution order, first non-empty wins:
 *   1. immutable release manifest written at build time
 *   2. the approved provider's build-time commit environment variable
 *   3. a repository read at boot (local/dev only)
 *   4. null — never a guess
 */
export function resolveRuntimeIdentity({ force = false, cwd = process.cwd() } = {}) {
  if (cached && !force) return cached;

  let runtimeCommit = null;
  let source = "UNKNOWN";

  // 1. immutable release manifest
  try {
    const manifestPath = path.join(cwd, "build-release.json");
    if (fs.existsSync(manifestPath)) {
      const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const v = normalize(m && m.runtimeCommit);
      if (v) { runtimeCommit = v; source = "RELEASE_MANIFEST"; }
    }
  } catch { /* fall through */ }

  // 2. provider build-time commit variables
  if (!runtimeCommit) {
    for (const key of ["RENDER_GIT_COMMIT", "SOURCE_VERSION", "VERCEL_GIT_COMMIT_SHA", "GIT_COMMIT", "COMMIT_SHA"]) {
      const v = normalize(process.env[key]);
      if (v) { runtimeCommit = v; source = `ENV:${key}`; break; }
    }
  }

  // 3. repository read (local/dev only)
  if (!runtimeCommit) {
    try {
      const v = normalize(execSync("git rev-parse HEAD", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
      if (v) { runtimeCommit = v; source = "GIT_WORKTREE"; }
    } catch { /* not a repo, or git unavailable */ }
  }

  cached = {
    runtimeCommit,                       // 40-hex or null; never a guess
    runtimeCommitSource: source,
    deploymentId: process.env.RENDER_SERVICE_ID || process.env.DEPLOYMENT_ID || null,
    service: "tina-backend"
  };
  return cached;
}

/** The minimal, safe public shape for /health. */
export function publicRuntimeIdentity() {
  const id = resolveRuntimeIdentity();
  return {
    runtimeCommit: id.runtimeCommit,
    runtimeCommitSource: id.runtimeCommitSource,
    deploymentId: id.deploymentId,
    service: id.service
  };
}

export default { resolveRuntimeIdentity, publicRuntimeIdentity };
