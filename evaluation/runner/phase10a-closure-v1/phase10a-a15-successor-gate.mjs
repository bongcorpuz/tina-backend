#!/usr/bin/env node
/*
 * PHASE-10A-A15-SUCCESSOR-CLOSURE-GATE-V1
 *
 * The authorized successor to PHASE-10A-A15-FINAL-CLOSURE-GATE-V1.
 *
 * A15 V1 recorded, truthfully, that six of the eleven Phase-10A roadmap exit
 * items had no executable definition and therefore no reachable PASS branch.
 * Owner decisions D1-D8 and D13-D14 supply those definitions. This runner
 * consumes them FORWARD:
 *
 *   - A15 V1 is NOT modified. Its bytes, its embedded CONTRACT, and its
 *     recorded findings are untouched, and it remains independently runnable.
 *   - Semantics are not re-implemented. Every behaviour A15 V1 already
 *     defines - path containment, ledger-row parsing and selection, evidence
 *     manifest rehashing, verdict extraction, status aggregation, exit-code
 *     mapping, argument parsing, runtime identity, worktree head reading - is
 *     IMPORTED from A15 V1 and used unchanged, so the two gates cannot drift.
 *   - What is added is exactly the missing pass-capable check catalogue for
 *     roadmap items 1-6, plus the D9/D10 additive item-7/item-8 split.
 *
 * PASS reachability: unlike A15 V1, items 1-6 have executable checks, but the
 * gate truthfully remains NOT_PASS_CAPABLE for two independently governed
 * reasons. D3 supplies no independently verifiable provenance/admission
 * definition for either item-4 alternative, and NB2 supplies no separately
 * authorized D8 holdout-admission mechanism for item 6. Self-authored records
 * and packet-shaped campaign assertions cannot clear either blocker.
 *
 * Governed inputs are PINNED BY DIGEST. The owner authorization artifact and
 * the approved-criteria artifact are both hash-pinned below. If either is
 * absent, or its bytes differ from the pinned digest, every criterion that
 * depends on it blocks as a precondition. Authorization cannot be edited
 * between approval and evaluation without this gate failing closed.
 *
 * I/O posture. No network, ever. The only subprocess is read-only Git plumbing,
 * invoked through spawnSync argument arrays with bounded buffers. D5/F3/F6/X4
 * require exact committed blob bytes, and F4 requires repository-history proof;
 * neither can be established from a CRLF checkout or working-tree prose. This
 * is a declared, deliberate divergence from A15 V1's no-subprocess posture; it
 * is recorded in SUCCESSOR_CONTRACT.ownerGovernedBehavior rather than glossed
 * over. Writes are confined to one allowlisted output tree, decided
 * structurally after symlink resolution using A15 V1's own containment
 * primitive.
 *
 * This runner does not close Phase 10A, does not authorize Phase 10B, does not
 * write knowledge/CURRENT_STATE.md, and cannot set any review disposition other
 * than PENDING_INTERNAL_REVIEW.
 */
"use strict";

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as V1 from "../phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs";
import * as CANON from "./canonical-bytes.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "../../..");

const ALLOWED_OUTPUT_PARENT = "evaluation/results/phase10a-closure-v1";
const LEDGER_PATH = "knowledge/CURRENT_STATE.md";

const AUTHORIZATION_PATH = "evaluation/results/phase10a-closure-v1/OWNER_AUTHORIZATION_D1_D15_V1.json";
const AUTHORIZATION_SHA256 = "ec6e6559645f277029c0fb7370940a1f58ca2b4fa5af07c50454a1daf1cf7b0f";
// V2 sequencing correction. The V1 criteria artifact required roadmap item 4 to
// reference the item-5 freeze manifest and a post-freeze campaign, while the
// owner-approved freeze precondition P1 requires item 4 to be SATISFIED first.
// Each item was a precondition of the other, so neither could ever be reached.
// V2 restores the owner-approved pre-freeze reading of item 4 and the item-5
// preconditions. V1's bytes are untouched and its digest is retained below so
// the supersession is auditable rather than silent.
const CRITERIA_PATH = "evaluation/results/phase10a-closure-v1/PHASE10A_APPROVED_EXIT_CRITERIA_V2.json";
const CRITERIA_SHA256 = "b528eb2b6e88de676407af017e5c023ae69c130020520809e6620e2f49beacf6";

const SUPERSEDED_CRITERIA_PATH =
  "evaluation/results/phase10a-closure-v1/PHASE10A_APPROVED_EXIT_CRITERIA_V1.json";
const SUPERSEDED_CRITERIA_SHA256 = "33d303d5bc46d524abb710a005c8d90471f1d0669c32ff10a6fd48bd91f6d045";

// Owner criteria-fidelity confirmation.
//
// The approved-criteria artifact declares owner fidelity confirmation as a hard
// PRECONDITION on items 1-6 and declares itself immutable. The confirmation is
// therefore recorded in a SEPARATE hash-pinned owner artifact rather than by
// editing the immutable one, and this runner carries only that artifact's
// DIGEST - never the approval itself. A confirmation is accepted only when it
// binds the exact criteria digest pinned above, so a confirmation issued for
// one set of criteria can never be carried over to a re-authored set.
const FIDELITY_CONFIRMATION_PATH =
  "evaluation/results/phase10a-closure-v1/OWNER_CRITERIA_FIDELITY_CONFIRMATION_V2.json";
const FIDELITY_CONFIRMATION_SHA256 = "96e8df286ecf7167ddb47402ba2cfc1d119e9e95cbc08d63c9e5ed40fadbaef9";

// The V1 confirmation is NOT retracted: it remains the valid confirmation for
// the V1 criteria digest it binds. It cannot carry over to V2 because the
// digest binding refuses it, which is the mechanism working as designed.
const SUPERSEDED_FIDELITY_CONFIRMATION_PATH =
  "evaluation/results/phase10a-closure-v1/OWNER_CRITERIA_FIDELITY_CONFIRMATION_V1.json";
const SUPERSEDED_FIDELITY_CONFIRMATION_SHA256 =
  "f7dfa05ee89f5b1b53ca46dd790d09aac49b1ba7a57a77a3e5dc9be2c0d89e81";

const ORACLE_ROW_TOTAL = 3720;

// D13 / owner decision package section 1.3: the relation figure must be reported
// as TWO figures. 1623 rows carry a non-empty expected-relation set; the other
// 2097 pass vacuously. A bare 3720/3720 conflates the two and is non-compliant.
const RELATION_SUBSTANTIVE_TOTAL = 1623;
const RELATION_VACUOUS_TOTAL = ORACLE_ROW_TOTAL - RELATION_SUBSTANTIVE_TOTAL;

// ── Sequencing stages (owner decision package sections 2.4 and 2.5) ─────────
//
// The freeze sits AFTER item 4 and BEFORE item 6. A criterion in an earlier
// stage may never require evidence produced in a later stage. The three fields
// below are LATER-STAGE evidence: an artifact for a PRE_FREEZE criterion that
// carries any of them was measured under a regime that criterion cannot
// describe, so its presence is refused rather than ignored.
const SEQUENCING_STAGE = Object.freeze({
  PRE_FREEZE: "PRE_FREEZE",
  FREEZE: "FREEZE",
  POST_FREEZE: "POST_FREEZE"
});

const STAGE_ORDER = Object.freeze([
  SEQUENCING_STAGE.PRE_FREEZE,
  SEQUENCING_STAGE.FREEZE,
  SEQUENCING_STAGE.POST_FREEZE
]);

const LATER_STAGE_EVIDENCE_FIELDS = Object.freeze([
  "freezeManifestSha256",
  "postFreezeCampaignId",
  "stagingAttribution"
]);

function stageIndex(stage) {
  const i = STAGE_ORDER.indexOf(stage);
  return i === -1 ? null : i;
}

// D3, verbatim. Any closure-evidence artifact for items 1-4 must carry exactly
// this sentence. A paraphrase does not satisfy a mandatory clause.
const ANTI_CIRCULARITY_CLAUSE =
  "Expectation-fitting to previously observed analyzer behavior is development evidence only and cannot establish closure.";

const HOLDOUT_KINDS = Object.freeze(["UNSEEN", "HOLDOUT", "BLIND"]);

const CANONICAL_EXPECTATION_SET = Object.freeze([
  Object.freeze({
    path: "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json",
    sha256: "0227a5b4b6c2eb552427e002b6a66d50b39a06635c84f74798de81ffa608b263"
  }),
  Object.freeze({
    path: "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/R20_DEVELOPMENT_ORACLE_FROZEN_R1.json",
    sha256: "ba0163932fc64d59070d8bba93a23645d03598abb07d612cea25607684503f1f"
  }),
  Object.freeze({
    path: "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r2/R20_DEVELOPMENT_ORACLE_FROZEN_R2.json",
    sha256: "1347a918ee643723531438bfe6d305756c6a43feffbe042ac1ddb2c6bf6c8ccd"
  }),
  Object.freeze({
    path: "evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/R20_DEVELOPMENT_ORACLE_FROZEN_R3.json",
    sha256: "ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54"
  })
]);

// ── Deep immutability ───────────────────────────────────────────────────────
//
// A15 V1's deepFreeze is private, so the successor carries its own. Identical
// semantics: Object.freeze is shallow, and a contract that can be mutated at
// depth after import is not a source of truth.
function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) deepFreeze(value[key]);
  return value;
}

// ── Status vocabulary, derived from A15 V1 rather than re-declared ──────────
//
// A15 V1 does not export ITEM_STATUS, but it does publish the vocabulary in
// CONTRACT.statusVocabulary.itemStatus. Deriving the successor's vocabulary
// from that published list makes silent divergence impossible: if V1's
// vocabulary ever changed, this throws at import instead of producing statuses
// V1's aggregate() would mishandle.
const REQUIRED_ITEM_STATUSES = Object.freeze([
  "PASS",
  "FAIL",
  "BLOCKED_MISSING_DEFINITION",
  "BLOCKED_MISSING_EVIDENCE",
  "BLOCKED_PRECONDITION",
  "NOT_APPLICABLE"
]);

export const ITEM_STATUS = (() => {
  const published = V1.CONTRACT?.statusVocabulary?.itemStatus;
  if (!Array.isArray(published)) {
    throw new Error("A15 V1 publishes no statusVocabulary.itemStatus; refusing to guess the status vocabulary");
  }
  const missing = REQUIRED_ITEM_STATUSES.filter((s) => !published.includes(s));
  if (missing.length > 0) {
    throw new Error(`A15 V1 item-status vocabulary is missing ${missing.join(", ")}; refusing to run against it`);
  }
  const extra = published.filter((s) => !REQUIRED_ITEM_STATUSES.includes(s));
  if (extra.length > 0) {
    throw new Error(
      `A15 V1 publishes item statuses this successor does not handle (${extra.join(", ")}); refusing to run against it`
    );
  }
  return Object.freeze(Object.fromEntries(REQUIRED_ITEM_STATUSES.map((s) => [s, s])));
})();

// Same ordering A15 V1 uses; earlier entries dominate later ones.
export const STATUS_PRECEDENCE = Object.freeze([
  ITEM_STATUS.BLOCKED_PRECONDITION,
  ITEM_STATUS.FAIL,
  ITEM_STATUS.BLOCKED_MISSING_EVIDENCE,
  ITEM_STATUS.BLOCKED_MISSING_DEFINITION,
  ITEM_STATUS.PASS
]);

/**
 * Prove, behaviourally, that this precedence agrees with the A15 V1 aggregate()
 * that will actually combine these item results. V1's STATUS_PRECEDENCE is
 * private, so it is checked through observable behaviour rather than read: for
 * every ordered pair, aggregating both statuses together must produce the same
 * overall outcome as aggregating the dominant one alone.
 *
 * Pure, deterministic, no I/O. Called at import so a divergence is a refusal to
 * load, not a wrong answer.
 */
export function assertPrecedenceConsistentWithV1() {
  const overall = (statuses) => {
    const agg = V1.aggregate(statuses.map((status, i) => ({ id: `synthetic-${i}`, status })));
    return `${agg.executionStatus}/${agg.blockedReason}`;
  };
  for (let i = 0; i < STATUS_PRECEDENCE.length; i += 1) {
    for (let j = i + 1; j < STATUS_PRECEDENCE.length; j += 1) {
      const dominant = STATUS_PRECEDENCE[i];
      const dominated = STATUS_PRECEDENCE[j];
      const together = overall([dominant, dominated]);
      const alone = overall([dominant]);
      if (together !== alone) {
        throw new Error(
          `A15 V1 aggregation does not treat ${dominant} as dominating ${dominated} ` +
            `(pair => ${together}, dominant alone => ${alone}); refusing to run with a divergent precedence`
        );
      }
    }
  }
  return true;
}

function worstStatus(statuses) {
  for (const candidate of STATUS_PRECEDENCE) {
    if (statuses.includes(candidate)) return candidate;
  }
  return ITEM_STATUS.PASS;
}

// ── Condition model ─────────────────────────────────────────────────────────
//
// Every new check method returns a flat list of named conditions, ALL of them
// evaluated - never short-circuited - so one missing artifact does not hide the
// other nine gaps behind it. A condition's class decides which status an unmet
// condition produces, which is how the granular A15 vocabulary is honoured
// without a per-method status guess.
export const CONDITION_CLASS = Object.freeze({
  PRECONDITION: "PRECONDITION",
  DEFINITION: "DEFINITION",
  EVIDENCE_PRESENCE: "EVIDENCE_PRESENCE",
  CONTENT: "CONTENT"
});

const CONDITION_CLASS_TO_STATUS = Object.freeze({
  PRECONDITION: ITEM_STATUS.BLOCKED_PRECONDITION,
  DEFINITION: ITEM_STATUS.BLOCKED_MISSING_DEFINITION,
  EVIDENCE_PRESENCE: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE,
  CONTENT: ITEM_STATUS.FAIL
});

const CONDITION_CLASS_PRECEDENCE = Object.freeze([
  CONDITION_CLASS.PRECONDITION,
  CONDITION_CLASS.DEFINITION,
  CONDITION_CLASS.EVIDENCE_PRESENCE,
  CONDITION_CLASS.CONTENT
]);

function condition(id, klass, satisfied, detail, extra = {}) {
  if (!Object.prototype.hasOwnProperty.call(CONDITION_CLASS, klass)) {
    throw new Error(`unknown condition class '${klass}' for condition '${id}'`);
  }
  return { id, class: klass, satisfied: satisfied === true, detail: String(detail), ...extra };
}

/**
 * Derive one item status from a condition list, fail-closed.
 *
 * An empty condition list is a refusal, not a vacuous PASS: a check that
 * asserted nothing must never report success. The unmet condition of the
 * highest-precedence class decides the status, so a missing precondition is
 * never reported as a content failure and a missing artifact is never reported
 * as a definitional gap.
 */
export function statusFromConditions(conditions, checkId) {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    throw new Error(`internal contract error: check '${checkId}' produced no conditions; refusing a vacuous PASS`);
  }
  const unmet = conditions.filter((c) => !c.satisfied);
  const safePause = conditions.filter((c) => !c.satisfied && c.safePauseRequired === true).map((c) => c.id);
  if (unmet.length === 0) {
    return {
      status: ITEM_STATUS.PASS,
      detail: `all ${conditions.length} conditions satisfied`,
      conditions,
      safePause
    };
  }
  for (const klass of CONDITION_CLASS_PRECEDENCE) {
    const inClass = unmet.filter((c) => c.class === klass);
    if (inClass.length === 0) continue;
    return {
      status: CONDITION_CLASS_TO_STATUS[klass],
      detail: `${unmet.length} of ${conditions.length} conditions unmet; controlling (${klass}): ${inClass
        .map((c) => `${c.id}: ${c.detail}`)
        .join(" | ")}`,
      conditions,
      safePause
    };
  }
  throw new Error(`internal contract error: unclassified unmet condition in check '${checkId}'`);
}

// ── Pinned-input verification ───────────────────────────────────────────────

const TOP_LEVEL_BYTE_BUDGET = 1 << 26;
const REQUIRED_ARTIFACT_BYTE_BUDGET = 1 << 28;

/**
 * Bounded, fail-closed read of one root-relative regular file.
 *
 * The target is resolved through symlinks/junctions before it is opened, and
 * both its lexical and real paths must remain below the evaluated root. The
 * file is opened once, sized from that handle, and read from that same handle;
 * callers therefore receive either one exact bounded snapshot or no bytes.
 */
export function topLevelRead(root, relPath, { kind = "TOP_LEVEL", maxBytes = TOP_LEVEL_BYTE_BUDGET } = {}) {
  const fail = (reasonCode, reason, extra = {}) => ({
    ok: false,
    present: false,
    kind,
    relPath,
    reasonCode,
    reason,
    bytes: null,
    ...extra
  });

  if (typeof relPath !== "string" || relPath.length === 0) {
    return fail("PATH_NOT_DECLARED", "no root-relative path declared");
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > 0x3fffffff) {
    return fail("INVALID_BYTE_BUDGET", `maxBytes must be a non-negative safe integer no greater than 1073741823 (got ${JSON.stringify(maxBytes)})`);
  }

  const rootAbs = path.resolve(root);
  const candidateAbs = path.resolve(rootAbs, relPath);
  if (!V1.isContained(rootAbs, candidateAbs)) {
    return fail("PATH_ESCAPES_ROOT", `path resolves outside the evaluated root: ${relPath}`, { escaped: true });
  }

  let realPath;
  try {
    realPath = fs.realpathSync.native(candidateAbs);
  } catch (error) {
    return fail(
      error?.code === "ENOENT" ? "INPUT_NOT_FOUND" : "INPUT_UNREADABLE",
      error?.code === "ENOENT" ? `path does not exist: ${relPath}` : `path cannot be resolved: ${error.message}`,
      { escaped: false }
    );
  }
  if (!V1.isContained(rootAbs, realPath)) {
    return fail("PATH_ESCAPES_ROOT", `real path escapes the evaluated root: ${relPath}`, { escaped: true, realPath });
  }

  let fd = null;
  try {
    fd = fs.openSync(realPath, "r");
    const before = fs.fstatSync(fd);
    if (!before.isFile()) {
      return fail("NOT_REGULAR_FILE", `path is not a regular file: ${relPath}`, {
        escaped: false,
        exists: true,
        isFile: false,
        realPath
      });
    }
    if (before.size > maxBytes) {
      return fail("INPUT_TOO_LARGE", `${kind} input is ${before.size} bytes, above the ${maxBytes}-byte limit`, {
        escaped: false,
        exists: true,
        isFile: true,
        size: before.size,
        realPath
      });
    }

    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const read = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (read === 0) break;
      offset += read;
    }
    const after = fs.fstatSync(fd);
    if (offset !== before.size || after.size !== before.size) {
      return fail("INPUT_CHANGED_DURING_READ", `${kind} input changed while it was being read`, {
        escaped: false,
        exists: true,
        isFile: true,
        realPath
      });
    }
    // Filesystem identity must stay exact: NTFS FileIDs routinely exceed
    // Number.MAX_SAFE_INTEGER, and float64 rounding collapses distinct odd IDs
    // that differ by one ulp into the same identity, which would make
    // pathsDistinct / noSelfReference fail spuriously. BigInt keeps the full
    // 64-bit dev+ino; the regular fstat above stays Number-typed for size math.
    const idStat = fs.fstatSync(fd, { bigint: true });
    return {
      ok: true,
      present: true,
      kind,
      relPath,
      reasonCode: null,
      reason: null,
      bytes,
      escaped: false,
      exists: true,
      isFile: true,
      size: before.size,
      realPath,
      statIdentity:
        idStat.dev !== undefined && idStat.ino !== undefined ? `${String(idStat.dev)}:${String(idStat.ino)}` : null
    };
  } catch (error) {
    return fail("INPUT_UNREADABLE", `unreadable ${kind} input: ${error.message}`, {
      escaped: false,
      exists: true,
      realPath
    });
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch { /* the read result already fails closed on I/O errors */ }
    }
  }
}

function readTextUnderRoot(root, relPath, maxBytes = TOP_LEVEL_BYTE_BUDGET) {
  const read = topLevelRead(root, relPath, { kind: "TOP_LEVEL_TEXT", maxBytes });
  if (!read.ok) {
    return {
      present: false,
      text: null,
      bytes: null,
      reason: read.reason,
      reasonCode: read.reasonCode,
      escaped: read.escaped === true
    };
  }
  return { present: true, text: read.bytes.toString("utf8"), bytes: read.bytes, reason: null, reasonCode: null };
}

function readJsonUnderRoot(root, relPath, maxBytes = TOP_LEVEL_BYTE_BUDGET) {
  const read = topLevelRead(root, relPath, { kind: "TOP_LEVEL_JSON", maxBytes });
  if (!read.ok) {
    return {
      present: false,
      value: null,
      bytes: null,
      parseError: null,
      reason: read.reason,
      reasonCode: read.reasonCode,
      escaped: read.escaped === true
    };
  }
  try {
    return { present: true, value: JSON.parse(read.bytes.toString("utf8")), bytes: read.bytes, parseError: null, reason: null };
  } catch (err) {
    return { present: true, value: null, bytes: read.bytes, parseError: err.message, reason: `unparseable JSON: ${err.message}` };
  }
}

/**
 * Verify a hash-pinned governed input.
 *
 * Matching is EOL-INDEPENDENT by construction: the pinned digest is compared
 * against both the raw bytes and the canonical (CRLF-to-LF) bytes, because a
 * governed JSON input checked out on Windows under core.autocrlf=true carries
 * CRLF in the working tree while its digest was taken over canonical bytes.
 * Hiding that difference would be the defect; reporting which form matched is
 * the remediation.
 *
 * The committed blob digest is reported too when the path is tracked, and is
 * deliberately NOT required: these artifacts are authored before they are
 * committed, and a gate that could only verify committed inputs could never be
 * run by the unit that authors them.
 */
export function verifyPinnedInput(root, relPath, expectedSha) {
  const found = readTextUnderRoot(root, relPath);
  if (!found.present) {
    return {
      present: false,
      relPath,
      expectedSha,
      matched: false,
      matchedForm: null,
      bytes: null,
      detail: `${found.reason ?? `not found: ${relPath}`}`
    };
  }
  const rawSha = CANON.rawSha256(found.bytes);
  const canonicalSha = CANON.canonicalSha256(found.bytes);
  let committedSha = null;
  let tracked = false;
  try {
    committedSha = CANON.committedBlobSha256(root, relPath);
    tracked = true;
  } catch {
    committedSha = null;
    tracked = false;
  }
  const matchedForm = rawSha === expectedSha ? "RAW" : canonicalSha === expectedSha ? "CANONICAL" : null;
  return {
    present: true,
    relPath,
    expectedSha,
    rawSha,
    canonicalSha,
    committedSha,
    tracked,
    matched: matchedForm !== null,
    matchedForm,
    bytes: found.bytes,
    committedAgrees: tracked ? committedSha === expectedSha : null,
    detail:
      matchedForm !== null
        ? `pinned digest matched ${matchedForm} bytes${tracked ? `; committed blob ${committedSha === expectedSha ? "agrees" : "differs"}` : "; path not yet tracked"}`
        : `pinned digest ${expectedSha} matches neither raw (${rawSha}) nor canonical (${canonicalSha}) bytes`
  };
}

// ── Contract ────────────────────────────────────────────────────────────────
//
// Same convention A15 V1 and the committed E2 runner follow: the contract is
// built inline as the single source of truth and is only ever written out as a
// hash-pinned snapshot inside a real execution's evidence directory. There is
// no separately editable pre-committed contract JSON beside this runner.
//
// The APPROVED CRITERIA are different in kind and are therefore handled
// differently: they are owner-approved INPUT (sequencing step 1, "approved
// criteria committed"), so they live in a committed artifact and this contract
// pins that artifact by digest. Evidence source paths are declared here as well
// as there, and a condition on every affected item requires the two to agree -
// so neither copy can drift from the other unnoticed.

export const SUCCESSOR_CONTRACT = deepFreeze({
  // The identity is deliberately unchanged: this is the same gate, with a
  // corrected contract, not a third gate. The version records the correction.
  identity: "PHASE-10A-A15-SUCCESSOR-CLOSURE-GATE-V1",
  version: 2,
  phase: "PHASE_10A",
  workUnit: "PHASE-10A-SEQUENCING-V2",

  sequencingCorrection: {
    correctedInVersion: 2,
    defect:
      "Version 1 required roadmap item 4 to reference the item-5 freeze manifest by digest, to name a post-freeze campaign, and (integrated subcheck) to carry staging attribution to the frozen commit, while the owner-approved freeze preconditions require item 4 to be SATISFIED on both subchecks before a freeze may be taken. Each item was a precondition of the other, so no evidence could satisfy both and neither item was reachable.",
    correction:
      "Item 4 is restored to PRE_FREEZE and its later-stage dependencies are removed. The owner-approved G1-G12 gate set, the split relation reporting, required artifacts A1-A5, the separate clean lock-verification run and the (i)/(ii) anti-circularity disjunction are restored. Item 5 carries preconditions P1, P2 and P3. Staging attribution remains in full on items 5 and 6.",
    detectionAddedForFutureInversions: true,
    v1ArtifactsModified: false,
    a15V1Modified: false
  },

  // Owner decision package sections 2.4 and 2.5: the freeze sits AFTER item 4
  // and BEFORE item 6. Declared here so that the ordering is a checkable
  // property of the contract rather than an implicit consequence of catalogue
  // position, and so a future edit that inverts it is refused rather than run.
  sequencingModel: {
    stages: STAGE_ORDER,
    itemStage: { 1: "POST_FREEZE", 2: "POST_FREEZE", 3: "POST_FREEZE", 4: "PRE_FREEZE", 5: "FREEZE", 6: "POST_FREEZE" },
    laterStageEvidenceFields: LATER_STAGE_EVIDENCE_FIELDS,
    rule:
      "A criterion in an earlier stage may never require evidence that can only exist in a later stage. A contract or an artifact that violates this is refused with safePauseRequired rather than reported as missing evidence, because no evidence could ever satisfy it.",
    freezePreconditions: {
      P1: "Criterion 4 SATISFIED on both subchecks 4a and 4b.",
      P2: "Tracked worktree clean at the moment of the freeze.",
      P3: "The frozen runtime file set enumerated explicitly by path in the freeze artifact."
    },
    blockedConditions: {
      B1: "Criterion 4 not SATISFIED. This is the present state: item 4 has not been executed."
    }
  },

  supersedes: {
    identity: "PHASE-10A-A15-FINAL-CLOSURE-GATE-V1",
    mode: "FORWARD_ONLY_ADDITIVE",
    v1Modified: false,
    v1RemainsRunnable: true,
    v1SemanticsImported: [
      "isContained",
      "parseLedgerTable",
      "selectLedgerRow",
      "verifyEvidenceManifest",
      "extractVerdict",
      "evaluateCheck (inherited methods only)",
      "aggregate",
      "exitCodeFor",
      "EXIT_CODES",
      "parseArgs",
      "runtimeIdentity",
      "readWorktreeHead",
      "LEDGER_ROW_SELECTION_RULE",
      "CONTRACT.statusVocabulary.itemStatus"
    ],
    rationale:
      "Importing A15 V1's helpers rather than copying them means the two gates cannot diverge on ledger-row selection, manifest verification, verdict extraction, containment or aggregation. The successor adds only the pass-capable catalogue A15 V1 lacked."
  },

  governedInputs: {
    authorization: { path: AUTHORIZATION_PATH, sha256: AUTHORIZATION_SHA256, pinned: true },
    approvedCriteria: { path: CRITERIA_PATH, sha256: CRITERIA_SHA256, pinned: true, version: 2 },

    // Retained so the supersession is auditable. These artifacts are NOT read by
    // this gate and confer nothing; they are recorded because a reviewer must be
    // able to see which criteria the gate stopped evaluating against, and when.
    supersededInputs: {
      approvedCriteriaV1: {
        path: SUPERSEDED_CRITERIA_PATH,
        sha256: SUPERSEDED_CRITERIA_SHA256,
        readByThisGate: false,
        modified: false,
        reason:
          "V1 required roadmap item 4 to reference the item-5 freeze manifest by digest, to name a post-freeze campaign, and (for the integrated subcheck) to carry staging attribution to the frozen commit. The owner-approved freeze precondition P1 requires item 4 to be SATISFIED on both subchecks before a freeze may be taken. Each item was therefore a precondition of the other and no evidence could ever satisfy both."
      },
      ownerCriteriaFidelityConfirmationV1: {
        path: SUPERSEDED_FIDELITY_CONFIRMATION_PATH,
        sha256: SUPERSEDED_FIDELITY_CONFIRMATION_SHA256,
        readByThisGate: false,
        modified: false,
        retracted: false,
        reason:
          "Still the valid confirmation for the V1 criteria digest it binds. It cannot be accepted for the V2 criteria because confirms.criteriaSha256 would not equal the digest this gate pins - the digest binding refusing a carried-over confirmation is the mechanism working as designed, not a defect."
      }
    },
    ownerCriteriaFidelityConfirmation: {
      path: FIDELITY_CONFIRMATION_PATH,
      sha256: FIDELITY_CONFIRMATION_SHA256,
      pinned: true,
      role:
        "Hash-verifiable owner record of the criteria-fidelity confirmation that the approved-criteria artifact declares as a PRECONDITION on items 1-6. Recorded additively because the criteria artifact declares immutable: true. Accepted only when present, digest-pinned, parseable, declaring CONFIRMED, and binding the criteria digest pinned above.",
      confersNoPass: true
    },
    pinningSemantics:
      "Both inputs are compared against the pinned digest over raw AND canonical (CRLF-to-LF) bytes, so a Windows CRLF checkout verifies identically to an LF checkout. A missing or altered input blocks every dependent criterion as a PRECONDITION; it never degrades quietly to a content failure and never passes.",
    ledger: { path: LEDGER_PATH, pinned: false, writtenByThisRunner: false },

    // Referenced for provenance only. It specifies how an admissible D8 campaign
    // must be commissioned, sealed and evaluated; it is not evidence and carries
    // no digest pin here, so a legitimate V2 revision of the commissioning terms
    // cannot break this gate. Item 6 is evidenced by the campaign ledger the
    // approved criteria name, never by the existence of this specification.
    holdoutCommissionSpecification: {
      path: "evaluation/results/phase10a-closure-v1/HOLDOUT_CAMPAIGN_COMMISSION_SPECIFICATION_V1.json",
      pinned: false,
      evaluationEffect: "NONE_INFORMATIONAL",
      satisfiesD8: false
    }
  },

  ownerDecisionsImplemented: {
    D1: "standaloneAndIntegratedExactGates has an operative definition; item 4 is evaluable.",
    D2: "Item 4 is ONE criterion with TWO mandatory subchecks (4a standalone, 4b integrated); both must PASS.",
    D3: "The anti-circularity clause is mandatory and machine-checked verbatim on every closure-evidence artifact for items 1-4. Item 4 remains blocked because the pinned criteria do not define independently verifiable provenance/admission for either alternative; a digest-verified self-authored declaration is not semantic proof.",
    D4: "frozenRuntime has an operative definition; item 5 is evaluable.",
    D5: "The freeze covers the complete 26-file governed runtime set from the WS1 precedent, identified by exact committed blob bytes and immutable digests - not the three analyzer service files.",
    D6: "Staging runtime identity is verified as part of freeze and post-freeze evidence. Production is out of scope and is never contacted or accepted.",
    D7: "postFreezeEvidence has an operative definition; item 6 is evaluable.",
    D8: "At least one genuinely unseen/holdout/blind post-freeze campaign is mandatory. R4 cannot supply it, and analyzer-informed evidence relabelled as unseen/holdout is a FAIL.",
    D9: "Roadmap items 7 and 8 read independent forward-looking gate-state rows.",
    D10: "The split is additive: historical combined rows are never rewritten, and the historical row can never produce PASS for a split criterion.",
    D11: "Development-governance (analyzer-informed) evidence is admissible as development governance only. It cannot mark items 1-3 PASS.",
    D13: "Relation closure is evaluated under exact-set equality with mandatory explicit reporting. Containment-declared evidence is not weakened into a pass; it blocks and requires SAFE_PAUSE with the exact conflict.",
    D14: "Reason closure must come from post-freeze independent/unseen/holdout evidence. Expectation revisions - including the 145 R3-to-R4 changes - can never be the proof."
  },

  antiCircularity: {
    mandatory: true,
    source: "D3",
    clause: ANTI_CIRCULARITY_CLAUSE,
    enforcement:
      "Items 1-4 require antiCircularity.clause to equal this sentence exactly and antiCircularity.expectationFittingUsed to be false. A paraphrase, an omission, or a true expectationFittingUsed flag is an unmet mandatory condition."
  },

  evidenceAdmissibility: {
    classes: ["DEVELOPMENT_GOVERNANCE", "INDEPENDENT_CLOSURE"],
    closureRequires: "INDEPENDENT_CLOSURE",
    rules: [
      "Analyzer-informed evidence is DEVELOPMENT_GOVERNANCE and can never establish closure (D8, D11, D14).",
      "R4 is not independent closure evidence and cannot supply the holdout requirement (D8).",
      "Evidence declared DEVELOPMENT_GOVERNANCE blocks as missing closure evidence; it is not read as a failure of the criterion, because it is valid evidence of something else.",
      "Evidence labelled UNSEEN/HOLDOUT/BLIND while analyzer-informed is a mislabelling FAIL, not a missing-evidence block."
    ]
  },

  frozenGovernedRuntimeSet: {
    source: "D5",
    precedent: "evaluation/results/phase-10a14-e1/RUNTIME_HASH_LOCK.sha256",
    expectedFileCount: 26,
    digestBasis: "SHA256_OF_COMMITTED_BLOB_AT_FROZEN_COMMIT",
    digestReuseFromWs1Prohibited: true,
    driftCheck: "CANONICAL_WORKTREE_BYTES_EQUAL_COMMITTED_BYTES",
    canonicalPolicy: CANON.CANONICAL_EOL_POLICY.policy,
    measuredAtBaseCommit: {
      filesPresent: 26,
      stillMatchingWs1Digests: 16,
      matchingWs1DigestsFromRawWorktreeBytes: 3,
      note:
        "Ten governed runtime files legitimately changed after WS1, so WS1's digests are not a Phase-10A freeze. Of the sixteen that did not change, only three hash to the sealed digest from RAW worktree bytes on this core.autocrlf=true checkout - which is why freeze verification is canonical/committed-bytes based rather than raw."
    }
  },

  stagingIdentity: {
    source: "D6",
    inScope: ["staging"],
    productionInScope: false,
    requirement:
      "Any staging deployment used for integrated or post-freeze evidence must be provably attributable to the frozen commit and runtime identity, naming the attribution method and the attribution evidence.",
    enforcement: "Declared attribution is checked structurally; an asserted match with no named method or evidence is unmet."
  },

  exitItems: [
    {
      id: "decisionClosure",
      roadmapItem: 1,
      roadmapWording: "decision closure",
      criterionId: "decisionClosure",
      checkMethod: "CLOSURE_ENVELOPE_EXACT",
      stage: SEQUENCING_STAGE.POST_FREEZE,
      criterion: "DECISION",
      evidenceSource: "evaluation/results/phase10a-closure-v1/closure/DECISION_CLOSURE_MANIFEST.json",
      statusNote:
        "A15 V1 could only confirm the 3720 total-count precondition and correctly refused to call that decision closure. D3/D8/D11/D14 now define what would: per-row exact decision equality under the frozen runtime, evidenced by a post-freeze INDEPENDENT_CLOSURE campaign with no expectation revision after the freeze."
    },
    {
      id: "relationClosure",
      roadmapItem: 2,
      roadmapWording: "relation closure",
      criterionId: "relationClosure",
      checkMethod: "CLOSURE_ENVELOPE_EXACT",
      stage: SEQUENCING_STAGE.POST_FREEZE,
      criterion: "RELATION",
      evidenceSource: "evaluation/results/phase10a-closure-v1/closure/RELATION_CLOSURE_MANIFEST.json",
      statusNote:
        "D13 controls: exact-set equality, mandatory explicit reporting of substantive versus vacuous zero-expectation rows, and no silent pass for a zero-expectation row carrying unexpected actual relations. The frozen R20 scorer's containment semantics conflict with this; the conflict is recorded and the ruling is not weakened."
    },
    {
      id: "reasonClosure",
      roadmapItem: 3,
      roadmapWording: "reason closure",
      criterionId: "reasonClosure",
      checkMethod: "CLOSURE_ENVELOPE_EXACT",
      stage: SEQUENCING_STAGE.POST_FREEZE,
      criterion: "REASON",
      evidenceSource: "evaluation/results/phase10a-closure-v1/closure/REASON_CLOSURE_MANIFEST.json",
      statusNote:
        "A15 V1 recorded reason as evidenced NOT satisfied (3575/3720). D14 forbids closing the gap with expectation revision: the 145 R3-to-R4 changes cannot be the proof, and closure must be demonstrated against the frozen runtime by genuinely post-freeze independent/unseen/holdout evidence."
    },
    {
      id: "standaloneAndIntegratedExactGates",
      roadmapItem: 4,
      roadmapWording: "standalone and integrated exact gates",
      criterionId: "standaloneAndIntegratedExactGates",
      checkMethod: "MULTI_SUBCHECK",
      structure: "ONE_CRITERION_TWO_MANDATORY_SUBCHECKS",
      stage: SEQUENCING_STAGE.PRE_FREEZE,
      statusNote:
        "D1 supplies the definition; D2 fixes the structure. One roadmap criterion, two mandatory subchecks, both must PASS, neither satisfies the criterion alone, and the pair may not be split into two roadmap criteria. V2 restores this criterion to PRE_FREEZE: the freeze is gated on it (item 5 precondition P1), so it cannot itself require a freeze manifest, a post-freeze campaign, or staging attribution to a frozen commit.",
      subChecks: [
        {
          id: "standalone",
          roadmapWording: "standalone exact gates",
          checkMethod: "EXACT_GATE_RESULT",
          mode: "STANDALONE",
          stage: SEQUENCING_STAGE.PRE_FREEZE,
          envelope: "EXACT_GATE_RESULT_V2",
          invocationPath: "HARNESS_DIRECT",
          evidenceSource: "evaluation/results/phase10a-closure-v1/closure/EXACT_GATE_STANDALONE_V2.json",
          requiredArtifacts: ["A1", "A2", "A3", "A4"],
          stagingAttributionRequired: false,
          deployedStagingRequired: false,
          externalNetworkPermitted: false,
          freezeManifestReferenceRequired: false,
          postFreezeCampaignRequired: false,
          runtimeIdentityMustEqualStandalone: false
        },
        {
          id: "integrated",
          roadmapWording: "integrated exact gates",
          checkMethod: "EXACT_GATE_RESULT",
          mode: "INTEGRATED",
          stage: SEQUENCING_STAGE.PRE_FREEZE,
          envelope: "EXACT_GATE_RESULT_V2",
          invocationPath: "IN_PROCESS_ASK_BOUNDARY",
          evidenceSource: "evaluation/results/phase10a-closure-v1/closure/EXACT_GATE_INTEGRATED_V2.json",
          requiredArtifacts: ["A1", "A2", "A3", "A4", "A5"],
          stagingAttributionRequired: false,
          deployedStagingRequired: false,
          externalNetworkPermitted: false,
          freezeManifestReferenceRequired: false,
          postFreezeCampaignRequired: false,
          runtimeIdentityMustEqualStandalone: true
        }
      ]
    },
    {
      id: "frozenRuntime",
      roadmapItem: 5,
      roadmapWording: "frozen runtime",
      criterionId: "frozenRuntime",
      checkMethod: "FREEZE_MANIFEST_EXACT",
      stage: SEQUENCING_STAGE.FREEZE,
      dependsOnItems: ["standaloneAndIntegratedExactGates"],
      preconditionIds: ["P1", "P2", "P3"],
      evidenceSource: "evaluation/results/phase10a-closure-v1/freeze/FREEZE_MANIFEST_V1.json",
      statusNote:
        "D4 supplies the definition; D5 selects the broader WS1 scope (all 26 governed runtime files, exact committed blob bytes, immutable digests); D6 adds staging runtime identity, production excluded. A15 V1 refused to borrow a unit-scoped runtime lock as the Phase-10A gate and that refusal stands: this item requires a Phase-10A freeze taken at its own frozen commit."
    },
    {
      id: "postFreezeEvidence",
      roadmapItem: 6,
      roadmapWording: "post-freeze evidence",
      criterionId: "postFreezeEvidence",
      checkMethod: "POST_FREEZE_CAMPAIGN_LEDGER",
      stage: SEQUENCING_STAGE.POST_FREEZE,
      dependsOnItems: ["frozenRuntime"],
      evidenceSource: "evaluation/results/phase10a-closure-v1/freeze/POST_FREEZE_CAMPAIGN_LEDGER_V1.json",
      statusNote:
        "D7 supplies the definition; D8 makes at least one genuinely unseen/holdout/blind campaign mandatory and excludes R4; D14 forbids any expectation revision between freeze and evidence. Ordering is pinned to the freeze digest, not asserted."
    },
    {
      id: "deterministicCleanCycles",
      roadmapItem: 7,
      roadmapWording: "deterministic clean cycles",
      criterionId: "deterministicCleanCycles",
      checkMethod: "LEDGER_ROW_SPLIT_GATE",
      evidenceSource: LEDGER_PATH,
      ledgerRowLabel: "Deterministic clean cycles closure",
      historicalCombinedRowLabel: "Deterministic clean/staging closure",
      expectedValue: "SATISFIED",
      statusNote:
        "D9 splits the combined row; D10 makes the split additive. The new row is read as authoritative by this contract. The historical combined row is consulted for diagnostic context only and can never produce PASS - a combined row cannot independently evidence two split criteria."
    },
    {
      id: "stagingCleanCycles",
      roadmapItem: 8,
      roadmapWording: "staging clean cycles",
      criterionId: "stagingCleanCycles",
      checkMethod: "LEDGER_ROW_SPLIT_GATE",
      evidenceSource: LEDGER_PATH,
      ledgerRowLabel: "Staging clean cycles closure",
      historicalCombinedRowLabel: "Deterministic clean/staging closure",
      expectedValue: "SATISFIED",
      statusNote: "See deterministicCleanCycles. Independent row, same additive split semantics."
    },
    {
      id: "independentReview",
      roadmapItem: 9,
      roadmapWording: "independent review",
      inheritedFromA15V1: true,
      checkMethod: "LEDGER_ROW_EQUALS",
      evidenceSource: LEDGER_PATH,
      ledgerRowLabel: "Post-R4 independent external Phase 10A review",
      expectedValue: "SATISFIED",
      statusNote:
        "Unchanged from A15 V1, deliberately: this item was already pass-capable and its evidence reading was already correct. Sequencing step 11 requires the fresh independent Phase-10A review to happen LAST, after freeze, post-freeze and holdout evidence exist."
    },
    {
      id: "e2",
      roadmapItem: 10,
      roadmapWording: "E2",
      inheritedFromA15V1: true,
      checkMethod: "READ_MANIFEST_AND_VERDICT",
      evidenceSource:
        "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3/E2_EVIDENCE_MANIFEST.sha256",
      internalReviewSource:
        "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3_INTERNAL_REVIEW.md",
      expectedVerdict: "ACCEPTED_FOR_E2_PUBLICATION",
      statusNote: "Unchanged from A15 V1. Every manifest entry is rehashed from the bytes on disk on every run."
    },
    {
      id: "a15",
      roadmapItem: 11,
      roadmapWording: "A15",
      inheritedFromA15V1: true,
      checkMethod: "NOT_APPLICABLE",
      statusNote: "The gate itself; it does not evaluate itself. A15 V1 said the same and it remains true of the successor."
    }
  ],

  b2ThroughB6: {
    disposition: "OPEN_UNCHANGED_OUT_OF_SCOPE",
    rationale: "Unchanged from A15 V1. B2-B6 are not in the controlling roadmap's eleven-item Phase-10A completion list.",
    evaluatedBySuccessor: false,
    modifiedBySuccessor: false
  },

  inputsAndPrerequisites: {
    authoringBaseHead: {
      branch: "feature/phase10a-closure-v1",
      commit: "0de779cd529271b9235eba3a1e4a8b051bf4c987",
      enforced: false,
      role: "PROVENANCE_RECORD",
      rationale:
        "Same honesty A15 V1 applied: the authoring base is recorded for traceability, not enforced as an equality precondition, because a governed successor execution will legitimately run from a later commit. What IS enforced for evidence-producing runs is that the root is a readable git worktree whose branch and commit are captured into the evidence.",
      observedHeadRecordedInResult: true,
      readableHeadRequiredForOutputMode: true
    },
    nodeRuntimeIdentity: V1.CONTRACT.inputsAndPrerequisites.nodeRuntimeIdentity
  },

  ownerGovernedBehavior: {
    networkAllowed: false,
    networkEnforcement:
      "This runner imports only node:child_process, node:crypto, node:fs, node:path, node:url, A15 V1, and canonical-bytes.mjs, and makes no outbound call of any kind.",
    subprocessAllowed: true,
    subprocessScope: [
      "git rev-parse --verify",
      "git rev-parse --is-shallow-repository",
      "git merge-base --is-ancestor",
      "git for-each-ref refs/replace",
      "git rev-list",
      "git ls-tree -r -z",
      "git diff --quiet --no-ext-diff",
      "git cat-file --batch",
      "git cat-file blob"
    ],
    subprocessRationale:
      "A DECLARED divergence from A15 V1's no-subprocess posture, required by D5/F3/F6/X4 for exact committed blob identity and by F4 for complete all-parent history proof. Every invocation uses a spawnSync argument array, bounded buffers, and GIT_NO_REPLACE_OBJECTS; the allowlisted plumbing is read-only, never invokes a shell, never writes, never fetches, and never touches a remote.",
    overwriteAllowed: false,
    overwriteEnforcement:
      "An evidence-producing run refuses when the output directory already exists, creates it non-recursively, and writes every artifact with the exclusive-create flag 'wx'.",
    outputConfinedToAllowlistedDirectoryTree: true,
    outputAllowlist: `${ALLOWED_OUTPUT_PARENT}/**`,
    outputConfinementSemantics:
      "The output directory must be the allowlisted directory itself or a descendant of it, decided structurally after symlink/junction resolution using A15 V1's own isContained primitive.",
    readOnlyWithRespectToEvidenceAndRuntime: true,
    neverWrites: [
      "knowledge/CURRENT_STATE.md",
      "server.js",
      "security/public-health.js",
      "evaluation/runner/phase-10a-a15-closure-gate/**",
      "evaluation/runner/phase-10a14-r20/**",
      "evaluation/results/phase-10a14-r20/**"
    ]
  },

  machineExitContract: {
    exitCodes: V1.EXIT_CODES,
    mappedBy: "A15 V1 exitCodeFor",
    note:
      "BLOCKED stays distinct from PASS and FAIL. A successor gate that cannot evaluate its criteria must not be indistinguishable from one that evaluated them successfully."
  },

  statusVocabulary: {
    itemStatus: REQUIRED_ITEM_STATUSES,
    executionStatus: ["PASS", "FAIL", "BLOCKED"],
    conditionClass: Object.values(CONDITION_CLASS),
    reviewDisposition: V1.CONTRACT.statusVocabulary.reviewDisposition
  },

  passReachability: {
    status: "NOT_PASS_CAPABLE",
    predecessorStatus: V1.CONTRACT.passReachability.status,
    declaration:
      "The current catalogue is not end-to-end PASS-capable: standaloneAndIntegratedExactGates remains blocked because D3 has no independently verifiable provenance/admission definition for either anti-circularity alternative, and postFreezeEvidence remains blocked by NB2_UNRESOLVED until a separately authorized holdout-admission mechanism exists. This is a contract capability statement, not a claim about repository evidence and not permission to accept self-authored proof records or packet-shaped campaign assertions.",
    derivedByCode: "computePassReachability()",
    doNotInventCriteria:
      "Where an owner-approved definition names evidence that does not exist, the item blocks. It is never satisfied by substituting a nearby artifact, by relabelling development-governance evidence, or by weakening a declared semantic."
  },

  phase10AClosure: {
    autoClose: false,
    closedByThisRunner: false,
    note:
      "A PASS execution status does not close Phase 10A. Closure is a separate owner action (sequencing step 13) taken after the fresh independent review (step 11) and the successor's final evaluation (step 12)."
  },

  sequencing: {
    mustNotBeReordered: true,
    thisRunnerImplements: [1, 12],
    note:
      "This runner is the step-12 evaluator, and the criteria artifact it pins is step 1. It deliberately cannot manufacture steps 2-11: each of those is evidence it reads, never evidence it produces."
  }
});

// ── Derived paths and shared vocabulary ─────────────────────────────────────
//
// Every path below is DERIVED from the contract rather than restated, so the
// contract remains the single declaration site. A missing catalogue entry is a
// load-time throw, not a silently undefined path.

function contractItem(id) {
  const found = SUCCESSOR_CONTRACT.exitItems.find((item) => item.id === id);
  if (!found) throw new Error(`internal contract error: no exit item '${id}' in the successor catalogue`);
  return found;
}

const FREEZE_MANIFEST_PATH = contractItem("frozenRuntime").evidenceSource;
const POST_FREEZE_LEDGER_PATH = contractItem("postFreezeEvidence").evidenceSource;

const CLOSURE_ENVELOPE_NAME = "CLOSURE_EVIDENCE_ENVELOPE_V1";
const FREEZE_ENVELOPE_NAME = "FREEZE_MANIFEST_V1";
const POST_FREEZE_ENVELOPE_NAME = "POST_FREEZE_CAMPAIGN_LEDGER_V1";

// Per-criterion equality semantics. D13 gives RELATION exact-set equality;
// DECISION and REASON are per-row exact match. These are the approved tokens,
// not a family of near-synonyms: a nearby label is a content failure.
const EXPECTED_SEMANTICS = Object.freeze({
  DECISION: "EXACT_MATCH_PER_ROW",
  RELATION: "EXACT_SET_EQUALITY",
  REASON: "EXACT_MATCH_PER_ROW"
});

const CONTAINMENT_SEMANTICS = "EXPECTED_SET_CONTAINMENT";

// ── Freeze reference ────────────────────────────────────────────────────────
//
// The freeze manifest is the ordering anchor for items 1-4 and 6: "after the
// freeze" is decided by matching a declared digest against the manifest's own
// bytes, never by a self-asserted flag or a timestamp. Matching accepts raw or
// canonical bytes for the same EOL reason verifyPinnedInput does.

function freezeReference(root) {
  const found = readTextUnderRoot(root, FREEZE_MANIFEST_PATH);
  if (!found.present) {
    return {
      present: false,
      relPath: FREEZE_MANIFEST_PATH,
      rawSha: null,
      canonicalSha: null,
      value: null,
      parseError: null
    };
  }
  let value = null;
  let parseError = null;
  try {
    value = JSON.parse(found.text);
  } catch (err) {
    parseError = err.message;
  }
  return {
    present: true,
    relPath: FREEZE_MANIFEST_PATH,
    rawSha: CANON.rawSha256(found.bytes),
    canonicalSha: CANON.canonicalSha256(found.bytes),
    value,
    parseError
  };
}

function digestPinsFreeze(freeze, declared) {
  if (!freeze.present || typeof declared !== "string" || declared.length === 0) return false;
  return declared === freeze.rawSha || declared === freeze.canonicalSha;
}

function freezeDigestDetail(freeze, declared) {
  if (!freeze.present) return `${FREEZE_MANIFEST_PATH} not present, so no ordering anchor exists to pin against`;
  if (typeof declared !== "string" || declared.length === 0) return "no freeze digest declared";
  if (digestPinsFreeze(freeze, declared)) return "declared digest pins the freeze manifest bytes";
  return `declared digest ${declared} matches neither raw (${freeze.rawSha}) nor canonical (${freeze.canonicalSha}) freeze-manifest bytes`;
}

function frozenCommitOf(freeze) {
  const commit = freeze.value?.frozenCommit;
  return typeof commit === "string" && /^[0-9a-f]{40}$/u.test(commit) ? commit : null;
}

// ── Governed inputs ─────────────────────────────────────────────────────────

/**
 * Load and verify the two hash-pinned governed inputs plus the freeze anchor.
 * Nothing here throws on a missing or altered input: absence must surface as a
 * precondition block on every dependent criterion, which is only possible if
 * evaluation continues far enough to report it.
 */
export function loadGovernedInputs(root) {
  const authorization = verifyPinnedInput(root, AUTHORIZATION_PATH, AUTHORIZATION_SHA256);
  const criteriaInput = verifyPinnedInput(root, CRITERIA_PATH, CRITERIA_SHA256);
  let criteria = null;
  let criteriaParseError = null;
  if (criteriaInput.present && Buffer.isBuffer(criteriaInput.bytes)) {
    try {
      criteria = JSON.parse(criteriaInput.bytes.toString("utf8"));
    } catch (error) {
      criteriaParseError = error.message;
    }
  }
  const fidelityInput = verifyPinnedInput(root, FIDELITY_CONFIRMATION_PATH, FIDELITY_CONFIRMATION_SHA256);
  let fidelity = null;
  let fidelityParseError = null;
  if (fidelityInput.present && Buffer.isBuffer(fidelityInput.bytes)) {
    try {
      fidelity = JSON.parse(fidelityInput.bytes.toString("utf8"));
    } catch (error) {
      fidelityParseError = error.message;
    }
  }
  return {
    authorization,
    criteriaInput,
    criteria,
    criteriaParseError,
    fidelityInput,
    fidelity,
    fidelityParseError,
    freeze: freezeReference(root)
  };
}

function governedInputConditions(gi) {
  return [
    condition(
      "authorization.present",
      CONDITION_CLASS.PRECONDITION,
      gi.authorization.present,
      gi.authorization.present ? `${AUTHORIZATION_PATH} present` : `${AUTHORIZATION_PATH} not found`
    ),
    condition(
      "authorization.digestPinned",
      CONDITION_CLASS.PRECONDITION,
      gi.authorization.present && gi.authorization.matched === true,
      gi.authorization.detail,
      {
        matchedForm: gi.authorization.matchedForm ?? null,
        committedAgrees: gi.authorization.committedAgrees ?? null
      }
    ),
    condition(
      "criteria.present",
      CONDITION_CLASS.PRECONDITION,
      gi.criteriaInput.present,
      gi.criteriaInput.present ? `${CRITERIA_PATH} present` : `${CRITERIA_PATH} not found`
    ),
    condition(
      "criteria.digestPinned",
      CONDITION_CLASS.PRECONDITION,
      gi.criteriaInput.present && gi.criteriaInput.matched === true,
      gi.criteriaInput.detail,
      {
        matchedForm: gi.criteriaInput.matchedForm ?? null,
        committedAgrees: gi.criteriaInput.committedAgrees ?? null
      }
    ),
    condition(
      "criteria.parsed",
      CONDITION_CLASS.PRECONDITION,
      gi.criteria !== null && typeof gi.criteria === "object",
      gi.criteria !== null && typeof gi.criteria === "object"
        ? "approved-criteria artifact parsed"
        : `approved-criteria artifact unparseable: ${gi.criteriaParseError ?? "absent"}`
    )
  ];
}

/**
 * The owner-fidelity precondition, taken from the criteria artifact's own
 * enforcement clause: the operative definitions for items 1-6 derive from an
 * uncommitted proposal, so PENDING blocks every one of them. This runner does
 * not read the flag as advisory and does not clear it on its own authority.
 */
/**
 * Owner criteria-fidelity resolution.
 *
 * Two admissible sources, in this order:
 *
 *   1. provenance.ownerConfirmationOfFidelityStatus inside the approved-criteria
 *      artifact (the mechanism that artifact declares for itself), or
 *   2. a SEPARATE hash-pinned owner confirmation artifact that binds the exact
 *      criteria digest this runner pins.
 *
 * Source 2 exists because the criteria artifact declares immutable: true, so
 * recording the confirmation additively is the only way to record it without
 * breaking a published immutability declaration. It is accepted only when it is
 * present, digest-pinned, parseable, declares CONFIRMED, and binds the criteria
 * digest - a confirmation issued for one set of criteria can never silently
 * authorise a re-authored set. Those extra checks are emitted as conditions
 * (not swallowed) whenever source 2 is load-bearing, so the report always shows
 * why the confirmation was or was not accepted.
 */
export function ownerFidelityConditions(gi) {
  const provenance = gi.criteria?.provenance ?? null;
  const criteriaStatus =
    typeof provenance?.ownerConfirmationOfFidelityStatus === "string"
      ? provenance.ownerConfirmationOfFidelityStatus
      : null;
  const confirmedByCriteria = criteriaStatus === "CONFIRMED";

  const conf = gi.fidelity ?? null;
  const confStatus =
    typeof conf?.provenance?.ownerConfirmationOfFidelityStatus === "string"
      ? conf.provenance.ownerConfirmationOfFidelityStatus
      : null;
  const confBoundDigest =
    typeof conf?.confirms?.criteriaSha256 === "string" ? conf.confirms.criteriaSha256 : null;
  const confPinned = gi.fidelityInput?.present === true && gi.fidelityInput?.matched === true;
  const confBinds = confBoundDigest === CRITERIA_SHA256;
  const confirmedByArtifact = confPinned && confStatus === "CONFIRMED" && confBinds;

  const confirmed = confirmedByCriteria || confirmedByArtifact;
  const source = confirmedByCriteria
    ? "APPROVED_CRITERIA_PROVENANCE"
    : confirmedByArtifact
      ? "SEPARATE_HASH_PINNED_OWNER_CONFIRMATION_ARTIFACT"
      : null;

  const conditions = [
    condition(
      "owner.criteriaFidelityConfirmed",
      CONDITION_CLASS.PRECONDITION,
      confirmed,
      confirmed
        ? `owner criteria fidelity CONFIRMED via ${source}`
        : criteriaStatus === null && conf === null
          ? "neither the approved-criteria artifact nor a pinned owner confirmation artifact declares ownerConfirmationOfFidelityStatus; refusing to assume confirmation"
          : `ownerConfirmationOfFidelityStatus = ${JSON.stringify(
              criteriaStatus
            )} in the criteria artifact and ${JSON.stringify(
              confStatus
            )} in the confirmation artifact (CONFIRMED required from one admissible source before any of items 1-6 can pass)`,
      {
        resolvedFrom: source,
        criteriaProvenanceStatus: criteriaStatus,
        confirmationArtifactStatus: confStatus,
        confirmationScope: conf?.provenance?.ownerConfirmationScope ?? null,
        confirmationExplicitNonImplications: conf?.explicitNonImplications?.doesNotMean ?? null,
        minimumOwnerActionToClear: confirmed ? null : provenance?.minimumOwnerActionToClear ?? null
      }
    )
  ];

  // Emitted only when the separate artifact is load-bearing: if the criteria
  // artifact itself already declares CONFIRMED, the confirmation artifact is
  // irrelevant and must not be able to fail the item.
  if (!confirmedByCriteria) {
    conditions.push(
      condition(
        "owner.fidelityConfirmationDigestPinned",
        CONDITION_CLASS.PRECONDITION,
        confPinned,
        gi.fidelityInput?.detail ?? `${FIDELITY_CONFIRMATION_PATH} not found`,
        {
          matchedForm: gi.fidelityInput?.matchedForm ?? null,
          committedAgrees: gi.fidelityInput?.committedAgrees ?? null
        }
      ),
      condition(
        "owner.fidelityConfirmationBindsCriteriaDigest",
        CONDITION_CLASS.DEFINITION,
        confBinds,
        confBoundDigest === null
          ? "owner confirmation artifact declares no confirms.criteriaSha256; an unbound confirmation cannot be applied to any criteria set"
          : `confirmation binds criteria digest ${confBoundDigest} (this runner pins ${CRITERIA_SHA256})`
      )
    );
  }

  return conditions;
}

/**
 * Cross-check the contract's declaration of a criterion against the committed
 * approved-criteria artifact. Both copies declare the evidence source and the
 * roadmap item; requiring them to agree is what stops either from drifting.
 *
 * `requireOwnerFidelity` defaults to true and is set false ONLY for roadmap
 * items 7 and 8: their operative definitions come from D9/D10 as recorded
 * binding decisions, not from the uncommitted proposal text whose fidelity the
 * criteria artifact's enforcement clause scopes to items 1-6.
 */
function criterionDefinitionConditions(gi, item, { requireOwnerFidelity = true } = {}) {
  const key = item.criterionId ?? item.id;
  const entry = gi.criteria?.criteria?.[key] ?? null;
  const conditions = [
    condition(
      "criteria.definitionPresent",
      CONDITION_CLASS.DEFINITION,
      entry !== null && typeof entry.definition === "string" && entry.definition.trim().length > 0,
      entry === null
        ? `approved criteria carry no entry '${key}'`
        : typeof entry.definition === "string" && entry.definition.trim().length > 0
          ? `operative definition present for '${key}'`
          : `entry '${key}' carries no operative definition`
    ),
    condition(
      "criteria.roadmapItemAgrees",
      CONDITION_CLASS.DEFINITION,
      entry !== null && Number(entry.roadmapItem) === item.roadmapItem,
      entry === null
        ? `approved criteria carry no entry '${key}'`
        : `contract roadmapItem ${item.roadmapItem} vs criteria roadmapItem ${entry.roadmapItem}`
    )
  ];

  // Emitted only when at least one side declares an evidence source, so the
  // condition is never a vacuous undefined-equals-undefined pass.
  const contractSource = item.evidenceSource ?? null;
  const criteriaSource = entry && typeof entry.evidenceSource === "string" ? entry.evidenceSource : null;
  if (contractSource !== null || criteriaSource !== null) {
    conditions.push(
      condition(
        "criteria.evidenceSourceAgrees",
        CONDITION_CLASS.DEFINITION,
        contractSource !== null && criteriaSource !== null && contractSource === criteriaSource,
        `contract evidenceSource ${JSON.stringify(contractSource)} vs criteria evidenceSource ${JSON.stringify(
          criteriaSource
        )}`
      )
    );
  }

  if (requireOwnerFidelity) conditions.push(...ownerFidelityConditions(gi));
  return conditions;
}

// ── Shared evidence-content conditions ──────────────────────────────────────

function antiCircularityConditions(envelope, prefix) {
  const ac = envelope?.antiCircularity ?? null;
  const clause = typeof ac?.clause === "string" ? ac.clause : null;
  return [
    condition(
      `${prefix}.antiCircularity.clauseVerbatim`,
      CONDITION_CLASS.CONTENT,
      clause === ANTI_CIRCULARITY_CLAUSE,
      clause === null
        ? "no antiCircularity.clause declared (D3 requires it verbatim)"
        : clause === ANTI_CIRCULARITY_CLAUSE
          ? "mandatory anti-circularity clause present verbatim"
          : `antiCircularity.clause is not the mandatory sentence verbatim: ${JSON.stringify(clause)}`
    ),
    condition(
      `${prefix}.antiCircularity.expectationFittingUsedFalse`,
      CONDITION_CLASS.CONTENT,
      ac?.expectationFittingUsed === false,
      `antiCircularity.expectationFittingUsed = ${JSON.stringify(
        ac?.expectationFittingUsed ?? null
      )} (false required)`
    )
  ];
}

/**
 * D11/D8: analyzer-informed evidence is valid DEVELOPMENT_GOVERNANCE evidence
 * of something else, so its presence blocks closure as missing closure evidence
 * rather than failing the criterion. An unrecognized class is a content failure.
 */
function evidenceClassCondition(envelope, prefix) {
  const cls = typeof envelope?.evidenceClass === "string" ? envelope.evidenceClass : null;
  const satisfied = cls === "INDEPENDENT_CLOSURE";
  const klass =
    cls === null || cls === "DEVELOPMENT_GOVERNANCE" ? CONDITION_CLASS.EVIDENCE_PRESENCE : CONDITION_CLASS.CONTENT;
  return condition(
    `${prefix}.evidenceClassIsIndependentClosure`,
    klass,
    satisfied,
    cls === null
      ? "no evidenceClass declared; INDEPENDENT_CLOSURE required for closure"
      : satisfied
        ? "evidenceClass = INDEPENDENT_CLOSURE"
        : cls === "DEVELOPMENT_GOVERNANCE"
          ? "evidenceClass = DEVELOPMENT_GOVERNANCE; admissible as development governance but never as closure evidence (D11)"
          : `evidenceClass = ${cls} is not an admissible class`,
    { evidenceClass: cls }
  );
}

/** True when a lineage element names R4 as a discrete token. */
function namesR4(element) {
  const text =
    typeof element === "string"
      ? element
      : element && typeof element === "object"
        ? String(element.id ?? element.revision ?? element.name ?? element.campaign ?? "")
        : "";
  return /(?:^|[^a-z0-9])r4(?![a-z0-9])/iu.test(text);
}

/**
 * D8 holdout admissibility for one campaign record. Mislabelling is a CONTENT
 * failure - an untrue label is worse than a missing one - while an honestly
 * labelled development-governance campaign is a missing-closure-evidence block.
 */
function holdoutConditions(campaign, prefix) {
  const kind = typeof campaign?.kind === "string" ? campaign.kind : null;
  const analyzerInformed = campaign?.analyzerInformed;
  const lineage = Array.isArray(campaign?.oracleLineage) ? campaign.oracleLineage : null;
  const r4InLineage = lineage === null ? null : lineage.some(namesR4);
  const labelledHoldout = kind !== null && HOLDOUT_KINDS.includes(kind);
  const mislabelled = labelledHoldout && analyzerInformed === true;
  return [
    condition(
      `${prefix}.notMislabelledAsHoldout`,
      CONDITION_CLASS.CONTENT,
      !mislabelled,
      mislabelled
        ? `campaign is labelled ${kind} while analyzerInformed = true; relabelling analyzer-informed evidence as unseen/holdout is a mislabelling failure (D8)`
        : "no unseen/holdout/blind label applied to analyzer-informed evidence"
    ),
    condition(
      `${prefix}.kindIsUnseenHoldoutOrBlind`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      labelledHoldout,
      `campaign kind = ${JSON.stringify(kind)} (one of ${HOLDOUT_KINDS.join(", ")} required)`
    ),
    condition(
      `${prefix}.analyzerInformedFalse`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      analyzerInformed === false,
      `campaign analyzerInformed = ${JSON.stringify(analyzerInformed ?? null)} (false required)`
    ),
    condition(
      `${prefix}.oracleLineageDeclared`,
      CONDITION_CLASS.CONTENT,
      lineage !== null,
      lineage === null
        ? "campaign declares no oracleLineage array; lineage cannot be checked structurally"
        : `oracleLineage declares ${lineage.length} element(s)`
    ),
    condition(
      `${prefix}.noR4OracleLineage`,
      CONDITION_CLASS.CONTENT,
      lineage !== null && r4InLineage === false,
      lineage === null
        ? "no oracleLineage to check for R4"
        : r4InLineage
          ? "oracleLineage names R4; R4 is analyzer-informed development-governance evidence and cannot supply the holdout requirement (D8)"
          : "oracleLineage names no R4 element"
    )
  ];
}

/**
 * NB2 admission gate. The commission specification is informational and no
 * separately authorized admission verifier exists yet, so packet-shaped fields
 * inside a campaign can be reported but can never self-verify or clear NB2.
 */
export function holdoutAdmissionConditions(campaign, prefix) {
  const packet = campaign?.commissioningAdmissionPacket ?? null;
  const present = packet !== null && typeof packet === "object" && !Array.isArray(packet);
  return [
    condition(
      `${prefix}.NB2_UNRESOLVED`,
      CONDITION_CLASS.PRECONDITION,
      false,
      "NB2_UNRESOLVED: no separately authorized D8 holdout-admission mechanism is implemented; the commission specification and campaign self-assertions confer no admission"
    ),
    condition(
      `${prefix}.commissionedAdmissionPacketPresent`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      present,
      present
        ? "campaign carries packet-shaped commissioningAdmissionPacket data, which remains untrusted input"
        : "campaign carries no commissioningAdmissionPacket"
    ),
    condition(
      `${prefix}.commissionedAdmissionPacketVerified`,
      CONDITION_CLASS.PRECONDITION,
      false,
      "no separately authorized verifier exists to authenticate a commissioning admission packet; self-declared verified/commissioned flags are not evidence"
    )
  ];
}

/** Freeze-ordering conditions shared by every post-freeze evidence artifact. */
function freezeOrderingConditions(freeze, campaign, prefix) {
  const declared =
    typeof campaign?.freezeDigestAtProduction === "string" ? campaign.freezeDigestAtProduction : null;
  return [
    condition(
      `${prefix}.freezeManifestPresent`,
      CONDITION_CLASS.PRECONDITION,
      freeze.present,
      freeze.present
        ? `${FREEZE_MANIFEST_PATH} present as the ordering anchor`
        : `${FREEZE_MANIFEST_PATH} not present`
    ),
    condition(
      `${prefix}.producedAfterFreeze`,
      CONDITION_CLASS.CONTENT,
      campaign?.producedAfterFreeze === true,
      `producedAfterFreeze = ${JSON.stringify(campaign?.producedAfterFreeze ?? null)} (true required)`
    ),
    condition(
      `${prefix}.pinnedToFreezeDigest`,
      CONDITION_CLASS.CONTENT,
      digestPinsFreeze(freeze, declared),
      freezeDigestDetail(freeze, declared)
    ),
    condition(
      `${prefix}.noExpectationRevisionsSinceFreeze`,
      CONDITION_CLASS.CONTENT,
      campaign?.expectationRevisionsSinceFreeze === 0,
      `expectationRevisionsSinceFreeze = ${JSON.stringify(
        campaign?.expectationRevisionsSinceFreeze ?? null
      )} (0 required; D14)`
    )
  ];
}

/** Exact-count conditions shared by the closure envelopes and the exact gates. */
function exactCountConditions(counts, prefix) {
  const total = counts?.totalRows;
  const exact = counts?.exactRows;
  const mismatch = counts?.mismatchRows;
  return [
    condition(
      `${prefix}.counts.totalRowsIsOracleTotal`,
      CONDITION_CLASS.CONTENT,
      total === ORACLE_ROW_TOTAL,
      `counts.totalRows = ${JSON.stringify(total ?? null)} (${ORACLE_ROW_TOTAL} required)`
    ),
    condition(
      `${prefix}.counts.exactRowsEqualsTotal`,
      CONDITION_CLASS.CONTENT,
      typeof exact === "number" && exact === total,
      `counts.exactRows = ${JSON.stringify(exact ?? null)}, counts.totalRows = ${JSON.stringify(total ?? null)}`
    ),
    condition(
      `${prefix}.counts.mismatchRowsZero`,
      CONDITION_CLASS.CONTENT,
      mismatch === 0,
      `counts.mismatchRows = ${JSON.stringify(mismatch ?? null)} (0 required)`
    )
  ];
}

// ── New check: CLOSURE_ENVELOPE_EXACT (roadmap items 1, 2, 3) ───────────────
//
// One envelope shape serves decision, relation and reason closure, because D3,
// D8, D11 and D14 impose the same admissibility spine on all three. What differs
// is the equality semantics and the criterion-specific additions below.

function relationExtraConditions(root, env, prefix) {
  const counts = env?.counts ?? null;
  const total = counts?.totalRows;
  const substantive = counts?.substantiveRelationRows;
  const vacuous = counts?.vacuousZeroExpectationRows;
  const reporting = env?.reporting ?? null;

  const REQUIRED_REPORTING = [
    "totalRows",
    "substantiveRelationRows",
    "vacuousZeroExpectationRows",
    "expectedRelationSet",
    "actualRelationSet",
    "extras",
    "omissions"
  ];
  const reportedMissing =
    reporting === null || typeof reporting !== "object"
      ? REQUIRED_REPORTING
      : REQUIRED_REPORTING.filter((field) => reporting[field] !== true);

  const conditions = [
    condition(
      `${prefix}.reporting.explicitFieldsDeclared`,
      CONDITION_CLASS.CONTENT,
      reportedMissing.length === 0,
      reportedMissing.length === 0
        ? "all seven mandatory relation reporting dimensions declared"
        : `reporting does not declare ${reportedMissing.join(", ")} (D13 requires explicit reporting of each)`
    ),
    condition(
      `${prefix}.counts.rowPartitionSumsToTotal`,
      CONDITION_CLASS.CONTENT,
      typeof substantive === "number" && typeof vacuous === "number" && substantive + vacuous === total,
      `substantiveRelationRows (${JSON.stringify(substantive ?? null)}) + vacuousZeroExpectationRows (${JSON.stringify(
        vacuous ?? null
      )}) must equal totalRows (${JSON.stringify(total ?? null)})`
    ),
    condition(
      `${prefix}.counts.extrasZero`,
      CONDITION_CLASS.CONTENT,
      counts?.extras === 0,
      `counts.extras = ${JSON.stringify(counts?.extras ?? null)} (0 required under exact-set equality)`
    ),
    condition(
      `${prefix}.counts.omissionsZero`,
      CONDITION_CLASS.CONTENT,
      counts?.omissions === 0,
      `counts.omissions = ${JSON.stringify(counts?.omissions ?? null)} (0 required under exact-set equality)`
    ),
    condition(
      `${prefix}.counts.zeroExpectationRowsWithUnexpectedActualsZero`,
      CONDITION_CLASS.CONTENT,
      counts?.zeroExpectationRowsWithUnexpectedActuals === 0,
      `counts.zeroExpectationRowsWithUnexpectedActuals = ${JSON.stringify(
        counts?.zeroExpectationRowsWithUnexpectedActuals ?? null
      )} (0 required; a zero-expectation row carrying unexpected actual relations must never pass silently)`
    )
  ];

  // D13's per-row proof obligation: the declared aggregates are recomputed from
  // the per-row source rather than trusted. A missing source is missing
  // evidence; a source that disagrees with its own aggregates is a failure.
  const perRowRel = typeof env?.perRowDetailSource === "string" ? env.perRowDetailSource : null;
  const perRow = perRowRel === null ? { present: false, value: null, parseError: null } : readJsonUnderRoot(root, perRowRel);
  const rows = Array.isArray(perRow.value?.rows) ? perRow.value.rows : null;
  const sumLen = (row, field) => (Array.isArray(row?.[field]) ? row[field].length : 0);
  const recomputedExtras = rows === null ? null : rows.reduce((n, row) => n + sumLen(row, "extras"), 0);
  const recomputedOmissions = rows === null ? null : rows.reduce((n, row) => n + sumLen(row, "omissions"), 0);

  conditions.push(
    condition(
      `${prefix}.perRowDetailSourcePresent`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      perRowRel !== null && perRow.present === true,
      perRowRel === null
        ? "envelope declares no perRowDetailSource; a per-row proof obligation cannot be met by aggregates alone"
        : perRow.present
          ? `per-row detail source present: ${perRowRel}`
          : `per-row detail source not found: ${perRowRel}`
    ),
    condition(
      `${prefix}.perRowDetailRowsParsed`,
      CONDITION_CLASS.CONTENT,
      rows !== null,
      rows !== null
        ? `per-row detail source carries ${rows.length} rows`
        : `per-row detail source carries no rows array${perRow.parseError ? ` (${perRow.parseError})` : ""}`
    ),
    condition(
      `${prefix}.perRowDetailRowCountEqualsTotal`,
      CONDITION_CLASS.CONTENT,
      rows !== null && rows.length === total,
      `per-row rows = ${JSON.stringify(rows === null ? null : rows.length)}, counts.totalRows = ${JSON.stringify(
        total ?? null
      )}`
    ),
    condition(
      `${prefix}.perRowDetailAggregatesAgree`,
      CONDITION_CLASS.CONTENT,
      rows !== null && recomputedExtras === counts?.extras && recomputedOmissions === counts?.omissions,
      `recomputed extras ${JSON.stringify(recomputedExtras)} vs declared ${JSON.stringify(
        counts?.extras ?? null
      )}; recomputed omissions ${JSON.stringify(recomputedOmissions)} vs declared ${JSON.stringify(
        counts?.omissions ?? null
      )}`
    )
  );
  return conditions;
}

function reasonExtraConditions(freeze, env, prefix) {
  const declaredRevision = env?.oracleRevision ?? null;
  const frozenRevision = freeze.value?.oracleRevision ?? null;
  return [
    condition(
      `${prefix}.oracleRevisionMatchesFreeze`,
      CONDITION_CLASS.CONTENT,
      declaredRevision !== null && frozenRevision !== null && declaredRevision === frozenRevision,
      `envelope oracleRevision ${JSON.stringify(declaredRevision)} vs freeze-manifest oracleRevision ${JSON.stringify(
        frozenRevision
      )}`
    ),
    condition(
      `${prefix}.notDerivedFromExpectationRevision`,
      CONDITION_CLASS.CONTENT,
      env?.derivedFromExpectationRevision === false,
      `derivedFromExpectationRevision = ${JSON.stringify(
        env?.derivedFromExpectationRevision ?? null
      )} (false required; the 145 R3-to-R4 expectation changes can never be the proof, D14)`
    ),
    condition(
      `${prefix}.revisionLineageNotUsedAsProof`,
      CONDITION_CLASS.CONTENT,
      env?.revisionLineageUsedAsProof === false,
      `revisionLineageUsedAsProof = ${JSON.stringify(env?.revisionLineageUsedAsProof ?? null)} (false required; D14)`
    )
  ];
}

function checkClosureEnvelopeExact(item, root, gi) {
  const prefix = "envelope";
  const conditions = [
    ...governedInputConditions(gi),
    ...criterionDefinitionConditions(gi, item),
    // Items 1-3 carry a stage too, and a stage the contract and the pinned
    // criteria disagree about is a governance defect wherever it appears - not
    // only on the two items the first V2 pass happened to wire this to.
    ...contractSequencingConditions(item, gi)
  ];

  const found = readJsonUnderRoot(root, item.evidenceSource);
  const env = found.value ?? null;

  conditions.push(
    condition(
      `${prefix}.present`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      found.present === true,
      found.present ? `${item.evidenceSource} present` : `${item.evidenceSource} not found`
    ),
    condition(
      `${prefix}.parsed`,
      CONDITION_CLASS.CONTENT,
      found.present === true && env !== null,
      found.present === false
        ? "no envelope to parse"
        : env !== null
          ? "closure envelope parsed"
          : `closure envelope unparseable: ${found.parseError}`
    ),
    condition(
      `${prefix}.declaredEnvelopeName`,
      CONDITION_CLASS.CONTENT,
      env?.envelope === CLOSURE_ENVELOPE_NAME,
      `envelope = ${JSON.stringify(env?.envelope ?? null)} (${CLOSURE_ENVELOPE_NAME} required)`
    ),
    condition(
      `${prefix}.criterionMatchesItem`,
      CONDITION_CLASS.CONTENT,
      env?.criterion === item.criterion,
      `envelope criterion = ${JSON.stringify(env?.criterion ?? null)} (${item.criterion} required)`
    )
  );

  // Semantics. A relation envelope that declares the frozen scorer's containment
  // semantics is the recorded D13 conflict: it is NOT weakened into a pass, and
  // it raises SAFE_PAUSE carrying the exact conflict.
  const expectedSemantics = EXPECTED_SEMANTICS[item.criterion];
  const declaredSemantics = typeof env?.semantics === "string" ? env.semantics : null;
  const containmentConflict = item.criterion === "RELATION" && declaredSemantics === CONTAINMENT_SEMANTICS;
  conditions.push(
    condition(
      `${prefix}.semantics`,
      CONDITION_CLASS.CONTENT,
      declaredSemantics === expectedSemantics,
      containmentConflict
        ? `envelope declares ${CONTAINMENT_SEMANTICS}, the frozen R20 scorer's semantics, but D13 requires ${expectedSemantics}. The owner ruling is not weakened: this blocks and requires SAFE_PAUSE with the exact conflict.`
        : `semantics = ${JSON.stringify(declaredSemantics)} (${expectedSemantics} required)`,
      containmentConflict
        ? {
            safePauseRequired: true,
            conflict: {
              declaredSemantics,
              requiredSemantics: expectedSemantics,
              ruling: "D13",
              doNotWeaken: true
            }
          }
        : {}
    )
  );

  conditions.push(evidenceClassCondition(env, prefix));
  conditions.push(...freezeOrderingConditions(gi.freeze, env?.campaign ?? null, `${prefix}.campaign`));
  conditions.push(...holdoutConditions(env?.campaign ?? null, `${prefix}.campaign`));
  conditions.push(...antiCircularityConditions(env, prefix));
  conditions.push(...exactCountConditions(env?.counts ?? null, prefix));

  if (item.criterion === "RELATION") conditions.push(...relationExtraConditions(root, env, prefix));
  if (item.criterion === "REASON") conditions.push(...reasonExtraConditions(gi.freeze, env, prefix));

  conditions.push(
    condition(
      `${prefix}.verdictClosed`,
      CONDITION_CLASS.CONTENT,
      env?.verdict === "CLOSED",
      `verdict = ${JSON.stringify(env?.verdict ?? null)} (CLOSED required)`
    )
  );

  return statusFromConditions(conditions, item.id);
}

// ── V2 sequencing correction: item-4 gate-set and stage helpers ─────────────
//
// These exist because V1 collapsed the owner-approved item-4 requirements to
// three aggregate counts and one boolean, and placed the criterion in the wrong
// stage. The figures are NOT hardcoded here: they are read from the hash-pinned
// approved-criteria artifact, so the gate and the criteria cannot drift, and a
// criteria artifact that omits the gate set blocks as a DEFINITION defect rather
// than passing vacuously.

/** The pinned criteria entry for roadmap item 4, or null when undefined. */
function criteriaExactGateSpec(gi) {
  const entry = gi.criteria?.criteria?.standaloneAndIntegratedExactGates ?? null;
  if (entry === null || typeof entry !== "object") return null;
  const set = entry.exactGateSet ?? null;
  if (set === null || typeof set !== "object") return null;
  const gates = set.gates ?? null;
  if (gates === null || typeof gates !== "object") return null;
  const ids = Array.isArray(set.gateIds) ? set.gateIds : null;
  if (ids === null || ids.length === 0) return null;

  // Every declared gate must carry a target this gate can compare against. An
  // omitted numerator, an omitted expected verdict or an omitted boolean field
  // would otherwise be compared undefined-to-undefined and pass by silence.
  const malformed = [];
  const splitIds = [];
  for (const id of ids) {
    const g = gates[id] ?? null;
    if (g === null || typeof g !== "object") {
      malformed.push(`${id}: gateIds lists it but gates declares no specification`);
      continue;
    }
    if (g.kind === "RATIO") {
      if (typeof g.numerator !== "number" || typeof g.denominator !== "number") {
        malformed.push(`${id}: RATIO without a numeric numerator and denominator`);
      }
      if (g.splitReportingRequired === true) {
        splitIds.push(id);
        if (typeof g.substantiveNumerator !== "number" || typeof g.substantiveDenominator !== "number") {
          malformed.push(`${id}: splitReportingRequired without numeric substantive figures`);
        }
      }
    } else if (g.kind === "VERDICT") {
      if (typeof g.expected !== "string" || g.expected.length === 0) {
        malformed.push(`${id}: VERDICT without a non-empty expected verdict`);
      }
    } else if (g.kind === "BOOLEAN") {
      if (typeof g.field !== "string" || g.field.length === 0) {
        malformed.push(`${id}: BOOLEAN without a field name`);
      }
      if (typeof g.expected !== "boolean") {
        malformed.push(`${id}: BOOLEAN without a boolean expected value`);
      }
    } else {
      malformed.push(`${id}: unrecognized kind ${JSON.stringify(g.kind ?? null)}`);
    }
  }

  return { entry, set, gates, ids, malformed, splitIds };
}

// A3 carries per-row evidence for 3720 rows and can legitimately run to several
// MB. The budget is generous enough for that and finite enough that a declared
// path cannot be used to make this gate read an unbounded file.
const ARTIFACT_BYTE_BUDGET = REQUIRED_ARTIFACT_BYTE_BUDGET;

/**
 * Read the bytes of a declared, repo-relative artifact path.
 *
 * Containment is decided BEFORE any filesystem access, through A15 V1's own
 * isContained primitive, so a declared path that escapes the evaluated root is
 * refused rather than read. A directory, a missing path, an oversized file and an
 * unreadable file each return a specific reason instead of a bare false, because
 * the reason is what the resulting condition detail has to say.
 */
function readBytesUnderRoot(root, rel) {
  return topLevelRead(root, rel, { kind: "REQUIRED_ARTIFACT", maxBytes: ARTIFACT_BYTE_BUDGET });
}

/**
 * State of a declared artifact path: whether it is declared, whether it resolves
 * inside the root, whether it is a regular file, and - when it is - the SHA-256
 * of its bytes in both the canonical LF-normalized form the approved method names
 * and the raw on-disk form.
 *
 * Both forms are computed because this repository checks out with core.autocrlf
 * and its sealed digests were taken on canonical bytes. Reporting which form
 * matched keeps a CRLF checkout from reading as drift while still refusing a
 * digest that matches neither.
 */
/**
 * Filesystem identity of a declared artifact path, for the distinctness check.
 *
 * Comparing the declared strings reports five distinct paths for five spellings
 * of one file: "./a.json" and "a.json" name the same file, as do a symlink and
 * its target, a junction and its target, and - on a case-insensitive filesystem -
 * two spellings differing only in case. realpath collapses all of them.
 *
 * The realpath call is made ONLY for a path already read successfully from inside
 * the evaluated root, so this adds no filesystem reach the gate did not already
 * have. An unresolvable path falls back to its root-resolved form, which is the
 * fail-closed direction: such a path has already failed pathExists, and the
 * fallback can never merge two paths that are genuinely distinct.
 */
function pathIdentity(root, rel, readable) {
  if (typeof rel !== "string" || rel.length === 0) return null;
  let inside;
  try {
    inside = path.resolve(root, rel);
  } catch {
    return rel;
  }
  if (readable !== true) return inside;
  // bigint: true keeps dev+ino exact beyond Number.MAX_SAFE_INTEGER; see the
  // identity note in topLevelRead. Fallbacks below stay unchanged.
  try {
    const real = fs.realpathSync.native(inside);
    const st = fs.statSync(real, { bigint: true });
    if (st.dev !== undefined && st.ino !== undefined) return `fs:${String(st.dev)}:${String(st.ino)}`;
    return process.platform === "win32" ? real.toLowerCase() : real;
  } catch {
    try {
      const real = fs.realpathSync(inside);
      const st = fs.statSync(real, { bigint: true });
      if (st.dev !== undefined && st.ino !== undefined) return `fs:${String(st.dev)}:${String(st.ino)}`;
      return process.platform === "win32" ? real.toLowerCase() : real;
    } catch {
      return process.platform === "win32" ? inside.toLowerCase() : inside;
    }
  }
}

function declaredPathState(root, rel) {
  if (typeof rel !== "string" || rel.length === 0) {
    return {
      declared: false,
      exists: false,
      isFile: false,
      escaped: false,
      identity: null,
      rawSha: null,
      canonicalSha: null,
      reason: "no path declared"
    };
  }
  const read = readBytesUnderRoot(root, rel);
  if (read.ok) {
    return {
      declared: true,
      exists: true,
      isFile: true,
      escaped: false,
      identity:
        read.statIdentity !== null
          ? `fs:${read.statIdentity}`
          : process.platform === "win32"
            ? read.realPath.toLowerCase()
            : read.realPath,
      rawSha: CANON.rawSha256(read.bytes),
      canonicalSha: CANON.canonicalSha256(read.bytes),
      bytes: read.bytes,
      reason: null
    };
  }
  return {
    declared: true,
    exists: read.exists === true,
    isFile: read.isFile === true,
    escaped: read.escaped === true,
    identity: pathIdentity(root, rel, false),
    rawSha: null,
    canonicalSha: null,
    bytes: null,
    reason: read.reason
  };
}

/** Resolve a dotted field path without letting a missing level throw. */
function fieldAt(obj, dotted) {
  let cur = obj;
  for (const seg of String(dotted).split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[seg];
  }
  return cur;
}

/** Iterative structural equality for parsed JSON values. */
function deepEqual(left, right, maxPairs = 20000) {
  const stack = [[left, right]];
  const paired = new WeakMap();
  let examined = 0;
  while (stack.length > 0) {
    if (examined >= maxPairs) return false;
    examined += 1;
    const [a, b] = stack.pop();
    if (Object.is(a, b)) continue;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (paired.has(a)) {
      if (paired.get(a) !== b) return false;
      continue;
    }
    paired.set(a, b);
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length || aKeys.some((key, index) => key !== bKeys[index])) return false;
    for (const key of aKeys) stack.push([a[key], b[key]]);
  }
  return true;
}

/**
 * G1-G12. The approved gate set declares, per gate, either a RATIO with a
 * numerator and a denominator, an explicit VERDICT, or a named BOOLEAN field.
 * The evidence must record the matching shape: a bare verdict never satisfies a
 * ratio gate, a truthy substitute never satisfies a boolean gate, and an absent
 * gate is never a pass.
 */
export function exactGateSetConditions(art, prefix, gi) {
  const spec = criteriaExactGateSpec(gi);
  if (spec === null) {
    return [
      condition(
        `${prefix}.gateSet.definitionAvailable`,
        CONDITION_CLASS.DEFINITION,
        false,
        "the pinned approved criteria declare no criteria.standaloneAndIntegratedExactGates.exactGateSet with a gateIds list and a gates map, so the twelve-gate set has no executable definition"
      )
    ];
  }

  const reported = art?.gates ?? null;
  const haveGates = reported !== null && typeof reported === "object";
  const missing = haveGates ? spec.ids.filter((id) => reported[id] === undefined || reported[id] === null) : spec.ids;

  const conditions = [
    condition(
      `${prefix}.gateSet.definitionAvailable`,
      CONDITION_CLASS.DEFINITION,
      true,
      `approved criteria declare ${spec.ids.length} mandatory gates: ${spec.ids.join(", ")}`
    ),
    condition(
      `${prefix}.gateSet.reported`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      haveGates,
      haveGates
        ? `evidence declares ${Object.keys(reported).length} gate entr(ies)`
        : "evidence declares no gates object, so none of G1-G12 is evidenced"
    ),
    condition(
      `${prefix}.gateSet.allGatesPresent`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      haveGates && missing.length === 0,
      !haveGates
        ? "no gates object to inspect"
        : missing.length === 0
          ? "every mandatory gate is reported"
          : `gates not reported: ${missing.join(", ")} (an absent gate is never a pass)`
    ),
    condition(
      `${prefix}.gateSet.specsWellFormed`,
      CONDITION_CLASS.DEFINITION,
      spec.malformed.length === 0,
      spec.malformed.length === 0
        ? "every approved gate specification declares a target this gate can compare against"
        : `approved gate specification(s) are unusable: ${spec.malformed.join("; ")}. An unstated target is a missing definition, not a satisfied gate.`
    ),
    condition(
      `${prefix}.gateSet.splitReportingGateDeclared`,
      CONDITION_CLASS.DEFINITION,
      spec.splitIds.length === 1,
      `approved criteria attach splitReportingRequired to ${spec.splitIds.length} gate(s)${
        spec.splitIds.length === 0 ? "" : ` (${spec.splitIds.join(", ")})`
      }; exactly one is required. D13's split relation obligation must be attached to a gate - if no gate carries it the obligation disappears silently, which is how a bare 3720/3720 would become acceptable again.`
    ),
    condition(
      `${prefix}.gateSet.noUndeclaredGates`,
      CONDITION_CLASS.CONTENT,
      !haveGates || Object.keys(reported).every((k) => spec.ids.includes(k)),
      !haveGates
        ? "no gates object to inspect"
        : (() => {
            const extra = Object.keys(reported).filter((k) => !spec.ids.includes(k));
            return extra.length === 0
              ? "evidence reports exactly the approved gate set"
              : `evidence reports gate(s) the approved criteria do not declare: ${extra.join(", ")}`;
          })()
    )
  ];

  for (const id of spec.ids) {
    const want = spec.gates[id] ?? null;
    const got = haveGates ? (reported[id] ?? null) : null;
    const label = `${prefix}.gate.${id}`;
    const metric = want?.metric ?? id;

    if (want === null || typeof want !== "object") {
      conditions.push(
        condition(
          `${label}.defined`,
          CONDITION_CLASS.DEFINITION,
          false,
          `approved criteria list gate ${id} in gateIds but declare no specification for it`
        )
      );
      continue;
    }

    if (want.kind === "RATIO") {
      const num = got?.numerator;
      const den = got?.denominator;
      // Both sides must be numbers. Without the typeof guards an absent target and
      // an absent figure compare undefined === undefined and the gate passes on
      // silence from both the criteria and the evidence.
      const ratioOk =
        typeof want.numerator === "number" &&
        typeof want.denominator === "number" &&
        typeof num === "number" &&
        typeof den === "number" &&
        num === want.numerator &&
        den === want.denominator;
      conditions.push(
        condition(
          `${label}.ratioExact`,
          CONDITION_CLASS.CONTENT,
          ratioOk,
          `${id} (${metric}) = ${JSON.stringify(num ?? null)}/${JSON.stringify(den ?? null)} (${want.numerator}/${want.denominator} required; both figures must be recorded, and a bare verdict does not satisfy a ratio gate)`
        )
      );
      if (want.splitReportingRequired === true) {
        const snum = got?.substantiveNumerator;
        const sden = got?.substantiveDenominator;
        const splitOk =
          typeof want.substantiveNumerator === "number" &&
          typeof want.substantiveDenominator === "number" &&
          typeof snum === "number" &&
          typeof sden === "number" &&
          snum === want.substantiveNumerator &&
          sden === want.substantiveDenominator;
        conditions.push(
          condition(
            `${label}.substantiveSplitReported`,
            CONDITION_CLASS.CONTENT,
            splitOk,
            `${id} substantive split = ${JSON.stringify(snum ?? null)}/${JSON.stringify(sden ?? null)} (${want.substantiveNumerator}/${want.substantiveDenominator} required; reporting only the total conflates ${want.substantiveDenominator} substantively-tested rows with ${RELATION_VACUOUS_TOTAL} vacuous passes)`
          ),
          condition(
            `${label}.substantiveTotalMatchesOracleSplit`,
            CONDITION_CLASS.DEFINITION,
            want.substantiveDenominator === RELATION_SUBSTANTIVE_TOTAL,
            `approved criteria declare the substantive relation subset as ${JSON.stringify(want.substantiveDenominator ?? null)} (${RELATION_SUBSTANTIVE_TOTAL} required)`
          )
        );
      }
    } else if (want.kind === "VERDICT") {
      conditions.push(
        condition(
          `${label}.verdict`,
          CONDITION_CLASS.CONTENT,
          typeof want.expected === "string" && want.expected.length > 0 && got?.verdict === want.expected,
          `${id} (${metric}) verdict = ${JSON.stringify(got?.verdict ?? null)} (${JSON.stringify(want.expected)} required; absence is not a pass)`
        )
      );
    } else if (want.kind === "BOOLEAN") {
      const field = typeof want.field === "string" ? want.field : "value";
      conditions.push(
        condition(
          `${label}.boolean`,
          CONDITION_CLASS.CONTENT,
          typeof want.expected === "boolean" && got?.[field] === want.expected,
          `${id} (${metric}) ${field} = ${JSON.stringify(got?.[field] ?? null)} (boolean ${JSON.stringify(want.expected)} required; a truthy substitute is not accepted)`
        )
      );
    } else {
      conditions.push(
        condition(
          `${label}.defined`,
          CONDITION_CLASS.DEFINITION,
          false,
          `approved criteria declare gate ${id} with unrecognized kind ${JSON.stringify(want.kind ?? null)}`
        )
      );
    }
  }

  return conditions;
}

/**
 * Recursive key-presence probe for the approved mustCarry lists.
 *
 * The approved package says A1 must carry a runtime identity and a
 * servicesTreeDigest, and A5 must carry an invocation path and a runtime
 * identity, but it does not state where in those documents the fields live.
 * Requiring a particular nesting would put a schema the owner never approved
 * into governance through a gate implementation, so presence anywhere in the
 * document is the faithful reading. The traversal is cycle-guarded and bounded.
 */
function carriesNonNullKey(value, key, maxNodes = 20000) {
  const stack = [value];
  const seen = new WeakSet();
  let examined = 0;
  while (stack.length > 0) {
    if (examined >= maxNodes) return { found: false, complete: false };
    const node = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    examined += 1;
    if (!Array.isArray(node) && Object.prototype.hasOwnProperty.call(node, key) && node[key] !== null) {
      return { found: true, complete: true };
    }
    for (const child of Array.isArray(node) ? node : Object.values(node)) stack.push(child);
  }
  return { found: false, complete: true };
}

/**
 * Resolve every declared required artifact to its on-disk state and digest
 * verdict, once, so the condition builders and the callers that need the states
 * for cross-artifact checks do not each re-read the same files.
 *
 * Exported so mutation tests can assert the resolution behaviour directly rather
 * than inferring it from condition text.
 */
export function requiredArtifactStates(art, sub, gi, root) {
  const spec = gi?.criteria?.criteria?.standaloneAndIntegratedExactGates?.requiredArtifacts ?? null;
  const artifacts = spec?.artifacts ?? null;
  const declaredIds = Array.isArray(sub?.requiredArtifacts) ? sub.requiredArtifacts : [];
  const reported = art?.requiredArtifacts ?? null;
  const haveReported = reported !== null && typeof reported === "object";
  const states = new Map();
  if (artifacts === null || typeof artifacts !== "object") return states;

  for (const id of declaredIds) {
    const want = artifacts[id] ?? null;
    const got = haveReported ? (reported[id] ?? null) : null;
    const declaredAsObject = got !== null && typeof got === "object" && !Array.isArray(got);
    const rel = declaredAsObject && typeof got.path === "string" && got.path.length > 0 ? got.path : null;
    const declaredSha =
      declaredAsObject && typeof got.sha256 === "string" && /^[0-9a-f]{64}$/u.test(got.sha256) ? got.sha256 : null;
    const state = declaredPathState(root, rel);

    let verdict = "UNVERIFIED";
    if (state.isFile === true && declaredSha !== null) {
      if (state.canonicalSha === declaredSha) verdict = CANON.VERDICTS.MATCH_EOL_INDEPENDENT;
      else if (state.rawSha === declaredSha) verdict = CANON.VERDICTS.MATCH_RAW_ONLY;
      else verdict = CANON.VERDICTS.MISMATCH;
    }

    const verified = verdict === CANON.VERDICTS.MATCH_EOL_INDEPENDENT;
    let parsedValue = null;
    let parseError = null;
    if (verified && Buffer.isBuffer(state.bytes)) {
      try {
        parsedValue = JSON.parse(state.bytes.toString("utf8"));
      } catch (error) {
        parseError = error.message;
      }
    }

    states.set(id, {
      id,
      want,
      got,
      declaredAsObject,
      rel,
      declaredSha,
      state,
      verdict,
      verified,
      verifiedBytes: verified ? state.bytes : null,
      parsedValue,
      parseError
    });
  }
  return states;
}

/**
 * A1-A5, approved method step 1. Each declared artifact must resolve inside the
 * evaluated root to a regular file whose SHA-256 on LF-normalized bytes equals
 * the digest the evidence recorded for it, the five paths must be five distinct
 * paths, and the evidence artifact must not cite itself as one of its own inputs.
 *
 * Every requirement flag is read with an omission-enforces default: a criteria
 * artifact that drops mustBeFile or digestRequired does not thereby switch the
 * check off, because a missing requirement in a governance artifact is a defect
 * in that artifact, not a permission.
 */
export function requiredArtifactConditions(art, sub, prefix, gi, root, states = null) {
  const spec = gi.criteria?.criteria?.standaloneAndIntegratedExactGates?.requiredArtifacts ?? null;
  const declaredIds = Array.isArray(sub.requiredArtifacts) ? sub.requiredArtifacts : [];
  const artifacts = spec?.artifacts ?? null;
  if (artifacts === null || typeof artifacts !== "object" || declaredIds.length === 0) {
    return [
      condition(
        `${prefix}.requiredArtifacts.definitionAvailable`,
        CONDITION_CLASS.DEFINITION,
        false,
        artifacts === null || typeof artifacts !== "object"
          ? "the pinned approved criteria declare no criteria.standaloneAndIntegratedExactGates.requiredArtifacts.artifacts map, so A1-A5 have no executable definition"
          : "the contract declares no requiredArtifacts for this subcheck, so A1-A5 would go unchecked"
      )
    ];
  }

  const reported = art?.requiredArtifacts ?? null;
  const haveReported = reported !== null && typeof reported === "object";
  const resolved = states instanceof Map ? states : requiredArtifactStates(art, sub, gi, root);
  // An omitted flag must not read as a waiver.
  const required = (flag) => flag !== false;
  const conditions = [
    condition(
      `${prefix}.requiredArtifacts.definitionAvailable`,
      CONDITION_CLASS.DEFINITION,
      declaredIds.every((id) => artifacts[id] !== undefined && artifacts[id] !== null),
      `subcheck requires ${declaredIds.join(", ")}; approved criteria define ${Object.keys(artifacts).join(", ")}`
    ),
    condition(
      `${prefix}.requiredArtifacts.appliesToAgreement`,
      CONDITION_CLASS.DEFINITION,
      (() => {
        const expected = Object.keys(artifacts)
          .filter((id) => {
            const a = artifacts[id];
            return !Array.isArray(a?.appliesTo) || a.appliesTo.includes(sub.id);
          })
          .sort();
        const actual = [...declaredIds].sort();
        return expected.length === actual.length && expected.every((id, i) => id === actual[i]);
      })(),
      `subcheck ${sub.id} requires ${[...declaredIds].sort().join(", ")}; approved criteria mark ${Object.keys(
        artifacts
      )
        .filter((id) => {
          const a = artifacts[id];
          return !Array.isArray(a?.appliesTo) || a.appliesTo.includes(sub.id);
        })
        .sort()
        .join(", ")} as applying to it. A contract that silently drops an applicable artifact would leave it unchecked.`
    ),
    condition(
      `${prefix}.requiredArtifacts.reported`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      haveReported,
      haveReported
        ? `evidence declares ${Object.keys(reported).length} required-artifact entr(ies)`
        : "evidence declares no requiredArtifacts object"
    )
  ];

  for (const id of declaredIds) {
    const want = artifacts[id] ?? null;
    const st = resolved.get(id) ?? null;
    const rel = st?.rel ?? null;
    // When a caller supplies resolved states, absence from that map is a
    // fail-closed missing state, never permission to re-read the path.
    const state = st?.state ?? declaredPathState(root, null);
    conditions.push(
      condition(
        `${prefix}.requiredArtifact.${id}.pathDeclared`,
        CONDITION_CLASS.EVIDENCE_PRESENCE,
        state.declared,
        state.declared
          ? `${id} declared at ${rel}`
          : `${id} not declared (required: ${JSON.stringify(want?.requirement ?? "unspecified")})`
      ),
      condition(
        `${prefix}.requiredArtifact.${id}.pathExists`,
        CONDITION_CLASS.EVIDENCE_PRESENCE,
        state.exists,
        !state.declared
          ? `${id} declares no path to resolve`
          : state.escaped
            ? `${id} declares ${rel}, which resolves outside the evaluated root and is refused`
            : state.exists
              ? `${id} resolves to an existing path`
              : `${id} declares ${rel}, which does not exist (naming an artifact is not having it)`
      )
    );

    if (required(want?.mustBeFile) || required(spec.mustBeRegularFile)) {
      conditions.push(
        condition(
          `${prefix}.requiredArtifact.${id}.isRegularFile`,
          CONDITION_CLASS.EVIDENCE_PRESENCE,
          state.isFile === true,
          state.isFile === true
            ? `${id} resolves to a regular file`
            : `${id} does not resolve to a regular file (${state.reason ?? "unknown reason"}). A directory has no digest to verify, and step 1 of the approved method requires a digest.`
        )
      );
    }

    if (required(want?.digestRequired) || required(spec.digestRequiredPerArtifact)) {
      conditions.push(
        condition(
          `${prefix}.requiredArtifact.${id}.digestDeclared`,
          CONDITION_CLASS.EVIDENCE_PRESENCE,
          st?.declaredSha !== null && st?.declaredSha !== undefined,
          st?.declaredAsObject !== true
            ? `${id} is declared as ${JSON.stringify(
                typeof st?.got
              )} rather than an object carrying path and sha256; a bare path carries no digest to verify against`
            : st?.declaredSha === null
              ? `${id} declares no valid 64-hex sha256`
              : `${id} declares sha256 ${st.declaredSha}`
        ),
        condition(
          `${prefix}.requiredArtifact.${id}.digestVerified`,
          CONDITION_CLASS.CONTENT,
          st?.verified === true,
          st?.verified === true
            ? `${id} digest verified from bytes on disk (${st.verdict})`
            : st?.verdict === CANON.VERDICTS.MATCH_RAW_ONLY
              ? `${id} matches only the raw CRLF-sensitive digest; SHA256_OF_LF_NORMALIZED_BYTES is required, so raw-only bytes are not verified`
            : st?.verdict === CANON.VERDICTS.MISMATCH
              ? `${id} declares sha256 ${st.declaredSha} but ${rel} hashes to ${st.state.canonicalSha} canonically and ${st.state.rawSha} raw`
              : `${id} could not be digest-verified (${
                  st?.state?.reason ?? "no readable bytes"
                }). This is the condition that anchors item 4 to bytes the evidence author did not author; it cannot be satisfied by assertion.`
        )
      );
    }

    if (Array.isArray(want?.mustCarry) && want.mustCarry.length > 0) {
      const doc =
        st?.verified === true && st.parsedValue !== null
          ? { ok: true, reason: null, value: st.parsedValue }
          : {
              ok: false,
              reason:
                st?.verified !== true
                  ? "artifact not digest-verified"
                  : `unparseable JSON: ${st?.parseError ?? "unknown parse error"}`,
              value: null
            };
      const carry = doc.ok
        ? want.mustCarry.map((key) => ({ key, ...carriesNonNullKey(doc.value, key) }))
        : want.mustCarry.map((key) => ({ key, found: false, complete: true }));
      const missing = carry.filter((entry) => !entry.found).map((entry) => entry.key);
      const incomplete = carry.filter((entry) => !entry.complete).map((entry) => entry.key);
      conditions.push(
        condition(
          `${prefix}.requiredArtifact.${id}.carriesRequiredFields`,
          CONDITION_CLASS.CONTENT,
          doc.ok && missing.length === 0 && incomplete.length === 0,
          !doc.ok
            ? `${id} could not be read to check its required fields ${want.mustCarry.join(", ")} (${doc.reason})`
            : incomplete.length > 0
              ? `${id} required-field scan exhausted its 20000-node budget while looking for ${incomplete.join(", ")}; an incomplete scan cannot establish presence`
              : missing.length === 0
                ? `${id} carries non-null values for ${want.mustCarry.join(", ")}`
                : `${id} does not carry a non-null value for ${missing.join(", ")} anywhere in its document`
        ),
        condition(
          `${prefix}.requiredArtifact.${id}.requiredFieldScanComplete`,
          CONDITION_CLASS.EVIDENCE_PRESENCE,
          doc.ok && incomplete.length === 0,
          !doc.ok
            ? `${id} has no parsed digest-verified document to scan`
            : incomplete.length === 0
              ? `${id} required-field scans completed within the 20000-node budget`
              : `${id} required-field scans were incomplete for ${incomplete.join(", ")}`
        )
      );
    }

    if (id === "A1") {
      const parsedIdentity = st?.verified === true ? (st.parsedValue?.runtimeIdentity ?? null) : null;
      const envelopeIdentity = art?.runtimeIdentity ?? null;
      const identitiesEqual =
        parsedIdentity !== null && envelopeIdentity !== null && deepEqual(parsedIdentity, envelopeIdentity);
      conditions.push(
        condition(
          `${prefix}.requiredArtifact.A1.runtimeIdentityMatchesEnvelope`,
          CONDITION_CLASS.CONTENT,
          identitiesEqual,
          identitiesEqual
            ? "A1's digest-verified runtimeIdentity equals the evidence envelope runtimeIdentity"
            : "A1's digest-verified runtimeIdentity and the evidence envelope runtimeIdentity must both be non-null and structurally equal"
        ),
        condition(
          `${prefix}.requiredArtifact.A1.servicesTreeDigestMatchesRecomputed`,
          CONDITION_CLASS.CONTENT,
          typeof parsedIdentity?.servicesTreeDigest === "string" &&
            typeof envelopeIdentity?.servicesTreeDigest === "string" &&
            parsedIdentity.servicesTreeDigest === envelopeIdentity.servicesTreeDigest,
          `A1 servicesTreeDigest ${JSON.stringify(parsedIdentity?.servicesTreeDigest ?? null)} vs envelope digest ${JSON.stringify(envelopeIdentity?.servicesTreeDigest ?? null)}, which servicesTreeDigestConditions independently recomputes`
        )
      );
    }

    if (id === "A5") {
      const parsed = st?.verified === true ? st.parsedValue : null;
      const parsedInvocation = parsed?.invocationRecord ?? null;
      const envelopeInvocation = art?.invocationRecord ?? null;
      const parsedIdentity = parsed?.runtimeIdentity ?? null;
      const envelopeIdentity = art?.runtimeIdentity ?? null;
      const invocationEqual =
        parsedInvocation !== null && envelopeInvocation !== null && deepEqual(parsedInvocation, envelopeInvocation);
      const identityEqual =
        parsedIdentity !== null && envelopeIdentity !== null && deepEqual(parsedIdentity, envelopeIdentity);
      conditions.push(
        condition(
          `${prefix}.requiredArtifact.A5.invocationMatchesEnvelope`,
          CONDITION_CLASS.CONTENT,
          invocationEqual,
          invocationEqual
            ? "A5's digest-verified invocationRecord equals the envelope invocationRecord"
            : "A5's digest-verified invocationRecord and the envelope invocationRecord must both be non-null and structurally equal"
        ),
        condition(
          `${prefix}.requiredArtifact.A5.runtimeIdentityMatchesEnvelope`,
          CONDITION_CLASS.CONTENT,
          identityEqual,
          identityEqual
            ? "A5's digest-verified runtimeIdentity equals the envelope runtimeIdentity"
            : "A5's digest-verified runtimeIdentity and the envelope runtimeIdentity must both be non-null and structurally equal"
        ),
        ...integratedBoundaryConditions(parsed, sub, `${prefix}.requiredArtifact.A5`)
      );
    }

    if (Array.isArray(want?.mustBeDistinctFrom) && want.mustBeDistinctFrom.length > 0) {
      // Identity, not spelling: "./x" and "x" are one file, and so are a symlink
      // and its target. Two ids naming one file are one run, not two.
      const mineId = state.identity ?? rel;
      const clashes = want.mustBeDistinctFrom.filter((other) => {
        const o = resolved.get(other) ?? null;
        if (rel === null || o === null || o.rel === null || o.rel === undefined) return false;
        return (o.state?.identity ?? o.rel) === mineId;
      });
      conditions.push(
        condition(
          `${prefix}.requiredArtifact.${id}.distinctFrom${want.mustBeDistinctFrom.join("")}`,
          CONDITION_CLASS.CONTENT,
          clashes.length === 0,
          clashes.length === 0
            ? `${id} declares a path distinct from ${want.mustBeDistinctFrom.join(", ")}`
            : `${id} declares the same path as ${clashes.join(", ")}: ${rel}. ${
                want.separatenessRule ?? "The same artifact cited twice is one run, not two."
              }`
        )
      );
    }
  }

  const declaredRels = [...resolved.values()].map((s) => s.rel).filter((r) => r !== null);

  if (required(spec.pathsMustBeRepoRelative)) {
    const offending = declaredRels.filter(
      (r) => path.isAbsolute(r) || r.includes("\\") || r.split("/").includes("..") || /^[A-Za-z]:/u.test(r)
    );
    conditions.push(
      condition(
        `${prefix}.requiredArtifacts.pathsRepoRelative`,
        CONDITION_CLASS.CONTENT,
        offending.length === 0,
        offending.length === 0
          ? "every declared artifact path is repository-relative"
          : `declared artifact path(s) ${offending.join(
              ", "
            )} are absolute, drive-qualified, backslash-separated or contain a parent traversal; only repository-relative forward-slash paths are read`
      )
    );
  }

  if (required(spec.pathsMustBeDistinct)) {
    const seen = new Map();
    const spellings = new Map();
    for (const [id, s] of resolved) {
      if (s.rel === null) continue;
      const key = s.state?.identity ?? s.rel;
      seen.set(key, [...(seen.get(key) ?? []), id]);
      spellings.set(key, [...new Set([...(spellings.get(key) ?? []), s.rel])]);
    }
    const dupes = [...seen.entries()].filter(([, ids]) => ids.length > 1);
    conditions.push(
      condition(
        `${prefix}.requiredArtifacts.pathsDistinct`,
        CONDITION_CLASS.CONTENT,
        dupes.length === 0 && declaredRels.length === declaredIds.length,
        dupes.length > 0
          ? `declared artifact paths collide: ${dupes
              .map(
                ([key, ids]) =>
                  `${ids.join(" and ")} both name the same file${
                    (spellings.get(key) ?? []).length > 1
                      ? ` through different spellings (${(spellings.get(key) ?? []).join(", ")})`
                      : ` ${(spellings.get(key) ?? [key])[0]}`
                  }`
              )
              .join("; ")}. ${declaredIds.length} artifacts require ${declaredIds.length} distinct files, compared by filesystem identity rather than by spelling.`
          : declaredRels.length !== declaredIds.length
            ? `${declaredRels.length} of ${declaredIds.length} required artifacts declare a path`
            : `${declaredRels.length} required artifacts declare ${declaredRels.length} distinct paths`
      )
    );
  }

  if (required(spec.selfReferenceProhibited)) {
    const selfRel = typeof sub?.evidenceSource === "string" ? sub.evidenceSource : null;
    const selfState = selfRel === null ? null : declaredPathState(root, selfRel);
    const selfIdentity = selfState?.identity ?? null;
    const selfCiting =
      selfRel === null
        ? []
        : [...resolved.values()]
            .filter((s) => {
              if (s.rel === null) return false;
              const artifactIdentity = s.state?.identity ?? pathIdentity(root, s.rel, false);
              return selfIdentity !== null && artifactIdentity === selfIdentity;
            })
            .map((s) => s.id);
    conditions.push(
      condition(
        `${prefix}.requiredArtifacts.noSelfReference`,
        CONDITION_CLASS.CONTENT,
        selfCiting.length === 0,
        selfCiting.length === 0
          ? "no required artifact names the evidence artifact itself"
          : `${selfCiting.join(", ")} name(s) the evidence artifact itself (${selfRel}). An artifact cannot be one of its own verified inputs; that is circular by construction.`
      )
    );
  }

  return conditions;
}

/**
 * Approved method step 2: verify servicesTreeDigest by recomputing SHA-256 over
 * the concatenated LF-normalized governed service files in their RECORDED order.
 *
 * This is the criterion's primary anchor. Every other item-4 condition compares
 * the evidence artifact to a contract constant or to another of its own fields,
 * so every other condition is satisfiable by whoever writes the artifact. This
 * one is not: it recomputes a digest from the worktree bytes of the 26 approved
 * governed runtime files, and no value the author writes can make those bytes
 * hash differently.
 *
 * The recorded order is verified rather than replaced by a canonical order,
 * because the order is part of the claim: an artifact whose recorded order does
 * not produce its recorded digest has not evidenced what it says it evidenced.
 */
export function servicesTreeDigestConditions(art, prefix, gi, root) {
  const spec =
    gi?.criteria?.criteria?.standaloneAndIntegratedExactGates?.deterministicVerificationMethod?.servicesTreeDigest ??
    null;
  const approved = Array.isArray(gi?.criteria?.frozenGovernedRuntimeSet?.paths)
    ? gi.criteria.frozenGovernedRuntimeSet.paths
    : null;

  if (spec === null || typeof spec !== "object" || approved === null || approved.length === 0) {
    return [
      condition(
        `${prefix}.servicesTreeDigest.definitionAvailable`,
        CONDITION_CLASS.DEFINITION,
        false,
        "the pinned approved criteria declare no deterministicVerificationMethod.servicesTreeDigest specification or no frozenGovernedRuntimeSet.paths, so step 2 has no executable definition"
      )
    ];
  }

  const expectedCount = typeof spec.expectedFileCount === "number" ? spec.expectedFileCount : approved.length;
  const declaredDigest = fieldAt(art, spec.evidenceDigestField ?? "runtimeIdentity.servicesTreeDigest");
  const declaredSet = fieldAt(art, spec.evidenceFileSetField ?? "runtimeIdentity.servicesTreeFileSet");
  const haveDigest = typeof declaredDigest === "string" && /^[0-9a-f]{64}$/u.test(declaredDigest);
  const haveSet = Array.isArray(declaredSet) && declaredSet.every((p) => typeof p === "string" && p.length > 0);

  const conditions = [
    condition(
      `${prefix}.servicesTreeDigest.definitionAvailable`,
      CONDITION_CLASS.DEFINITION,
      approved.length === expectedCount,
      `approved criteria declare ${approved.length} governed runtime path(s) against an expected count of ${expectedCount}`
    ),
    condition(
      `${prefix}.servicesTreeDigest.declared`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      haveDigest,
      haveDigest
        ? `evidence records ${spec.evidenceDigestField} = ${declaredDigest}`
        : `evidence records no valid 64-hex ${spec.evidenceDigestField}`
    ),
    condition(
      `${prefix}.servicesTreeDigest.fileSetRecorded`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      haveSet,
      haveSet
        ? `evidence records an ordered file set of ${declaredSet.length} path(s)`
        : `evidence records no ${spec.evidenceFileSetField} array. ${
            spec.evidenceFileSetFieldNote ?? "The order the digest was computed over must be recorded, because the digest is verified against that order."
          }`
    )
  ];

  if (spec.setEqualityRequired !== false) {
    const approvedSorted = [...approved].sort();
    const declaredSorted = haveSet ? [...declaredSet].sort() : [];
    const missing = approvedSorted.filter((p) => !declaredSorted.includes(p));
    const extra = declaredSorted.filter((p) => !approvedSorted.includes(p));
    conditions.push(
      condition(
        `${prefix}.servicesTreeDigest.fileSetEqualsApproved`,
        CONDITION_CLASS.CONTENT,
        haveSet && missing.length === 0 && extra.length === 0 && declaredSet.length === approved.length,
        !haveSet
          ? "no recorded file set to compare against the approved governed runtime set"
          : missing.length === 0 && extra.length === 0 && declaredSet.length === approved.length
            ? `recorded file set equals the approved ${approved.length}-path governed runtime set`
            : `recorded file set differs from the approved governed runtime set${
                missing.length > 0 ? `; omits ${missing.join(", ")}` : ""
              }${extra.length > 0 ? `; adds ${extra.join(", ")}` : ""}${
                declaredSet.length !== approved.length ? `; records ${declaredSet.length} of ${approved.length} paths` : ""
              }. ${spec.setEqualityRule ?? ""}`
      )
    );
  }

  // The recomputation itself. Unreadable governed files are reported as such
  // rather than silently skipped, because a skipped file would shrink the byte
  // range the digest covers and that is exactly the substitution setEquality
  // exists to prevent.
  let recomputed = null;
  const unreadable = [];
  if (haveSet && declaredSet.length > 0) {
    const hash = createHash("sha256");
    for (const rel of declaredSet) {
      const read = readBytesUnderRoot(root, rel);
      if (!read.ok) {
        unreadable.push(`${rel} (${read.reason})`);
        continue;
      }
      hash.update(CANON.normalizeToLf(read.bytes));
    }
    if (unreadable.length === 0) recomputed = hash.digest("hex");
  }

  conditions.push(
    condition(
      `${prefix}.servicesTreeDigest.governedFilesReadable`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      haveSet && unreadable.length === 0,
      !haveSet
        ? "no recorded file set to read"
        : unreadable.length === 0
          ? `all ${declaredSet.length} recorded governed file(s) were read from the worktree`
          : `recorded governed file(s) could not be read: ${unreadable.join("; ")}`
    ),
    condition(
      `${prefix}.servicesTreeDigest.recomputesFromBytes`,
      CONDITION_CLASS.CONTENT,
      haveDigest && recomputed !== null && recomputed === declaredDigest,
      recomputed === null
        ? `servicesTreeDigest could not be recomputed from worktree bytes. ${
            spec.whyThisIsTheAnchor ?? ""
          }`
        : recomputed === declaredDigest
          ? `servicesTreeDigest recomputes from the LF-normalized worktree bytes of the ${declaredSet.length} recorded governed files in the recorded order`
          : `servicesTreeDigest ${JSON.stringify(
              declaredDigest
            )} does not match ${recomputed}, recomputed over the LF-normalized worktree bytes of the recorded files in the recorded order. ${
              spec.orderRule ?? ""
            }`
    )
  );

  return conditions;
}

/**
 * Approved method step 3: recompute every aggregate in A2 from A3 and require
 * exact agreement.
 *
 * The enforcement limit is declared in the criteria artifact itself, at
 * deterministicVerificationMethod.aggregateRecomputation.limitStatement, and is
 * repeated in the failing condition's detail so it reaches a reader of the
 * evidence and not only a reader of the governance: the gate verifies A3's
 * digest from bytes, requires the recomputation record to bind that verified
 * digest, and requires the recomputed figures to equal A2's, but does not itself
 * re-derive the 3720 rows, because the approved package defines no A3 row schema.
 */
export function aggregateRecomputationConditions(art, prefix, gi, states, root = null) {
  const spec =
    gi?.criteria?.criteria?.standaloneAndIntegratedExactGates?.deterministicVerificationMethod
      ?.aggregateRecomputation ?? null;
  if (spec === null || typeof spec !== "object") {
    return [
      condition(
        `${prefix}.aggregateRecomputation.definitionAvailable`,
        CONDITION_CLASS.DEFINITION,
        false,
        "the pinned approved criteria declare no deterministicVerificationMethod.aggregateRecomputation specification, so step 3 has no executable definition"
      )
    ];
  }

  const recField = spec.recomputationRecordField ?? "aggregateRecomputation";
  const rec = fieldAt(art, recField) ?? null;
  const haveRec = rec !== null && typeof rec === "object" && !Array.isArray(rec);
  const a3 = states instanceof Map ? (states.get("A3") ?? null) : null;

  const conditions = [
    condition(
      `${prefix}.aggregateRecomputation.recordPresent`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      haveRec,
      haveRec ? `evidence records ${recField}` : `evidence records no ${recField} object`
    )
  ];

  if (spec.mustBindVerifiedA3Digest !== false) {
    const bindField = spec.a3DigestBindingField ?? "a3Sha256";
    const bound = haveRec ? rec[bindField] : undefined;
    const ok =
      a3?.verified === true &&
      typeof bound === "string" &&
      typeof a3.declaredSha === "string" &&
      bound === a3.declaredSha;
    conditions.push(
      condition(
        `${prefix}.aggregateRecomputation.bindsVerifiedA3Digest`,
        CONDITION_CLASS.CONTENT,
        ok,
        ok
          ? `${recField}.${bindField} binds A3's gate-verified digest ${bound}`
          : a3?.verified !== true
            ? `A3 is not digest-verified, so no recomputation record can be bound to it. ${spec.limitStatement ?? ""}`
            : `${recField}.${bindField} = ${JSON.stringify(
                bound ?? null
              )} does not equal A3's verified digest ${a3.declaredSha}. A recomputation not bound to the verified row evidence is not a recomputation from A3.`
      )
    );
  }

  const a3Spec =
    gi?.criteria?.criteria?.standaloneAndIntegratedExactGates?.requiredArtifacts?.artifacts?.A3 ?? null;
  if (
    a3Spec !== null &&
    typeof a3Spec.rowCountMustEqual === "number" &&
    a3Spec.rowCountVerifiedFromBytesByGate !== false
  ) {
    const rowsField = typeof a3Spec.rowsField === "string" && a3Spec.rowsField.length > 0 ? a3Spec.rowsField : null;
    if (rowsField === null) {
      conditions.push(
        condition(
          `${prefix}.aggregateRecomputation.a3RowsFieldDefined`,
          CONDITION_CLASS.DEFINITION,
          false,
          "the pinned approved criteria require A3 to hold a specific number of rows but name no field that carries them, so the requirement has no executable definition and would be satisfied by an A3 of any size"
        )
      );
    } else {
      const doc =
        a3?.verified === true && a3.parsedValue !== null
          ? { ok: true, reason: null, value: a3.parsedValue }
          : {
              ok: false,
              reason:
                a3?.verified !== true
                  ? "A3 is not digest-verified"
                  : `A3 is not parseable JSON (${a3?.parseError ?? "unknown parse error"})`,
              value: null
            };
      const rows = doc.ok ? fieldAt(doc.value, rowsField) : undefined;
      const counted = Array.isArray(rows) ? rows.length : null;
      const ok = counted === a3Spec.rowCountMustEqual;
      conditions.push(
        condition(
          `${prefix}.aggregateRecomputation.a3RowsCountedFromBytes`,
          CONDITION_CLASS.CONTENT,
          ok,
          !doc.ok
            ? `A3's rows could not be counted: ${doc.reason}. ${a3Spec.rowCountRule ?? ""}`
            : counted === null
              ? `A3 carries no array at ${rowsField}, so its row count cannot be verified. ${
                  a3Spec.rowCountRule ?? ""
                }`
              : ok
                ? `A3's digest-verified bytes carry ${counted} rows at ${rowsField}, as required`
                : `A3's digest-verified bytes carry ${counted} rows at ${rowsField}; ${
                    a3Spec.rowCountMustEqual
                  } are required. ${a3Spec.sufficiencyRule ?? ""}`
        )
      );
    }
  }

  if (typeof spec.a3RowCountMustEqual === "number") {
    const rowField = spec.rowCountField ?? "rowsRecomputed";
    const rows = haveRec ? rec[rowField] : undefined;
    conditions.push(
      condition(
        `${prefix}.aggregateRecomputation.rowCount`,
        CONDITION_CLASS.CONTENT,
        rows === spec.a3RowCountMustEqual,
        `${recField}.${rowField} = ${JSON.stringify(rows ?? null)} (${
          spec.a3RowCountMustEqual
        } required; row evidence covering a subset cannot support A2's aggregates)`
      )
    );
  }

  if (spec.perGateFiguresMustEqualA2 !== false) {
    const figField = spec.figuresField ?? "gates";
    const covered = Array.isArray(spec.gatesCovered) ? spec.gatesCovered : [];
    const recGates = haveRec ? (rec[figField] ?? null) : null;
    const a2Gates = art?.gates ?? null;
    for (const id of covered) {
      const r = recGates !== null && typeof recGates === "object" ? (recGates[id] ?? null) : null;
      const a = a2Gates !== null && typeof a2Gates === "object" ? (a2Gates[id] ?? null) : null;
      // The split figures are only compared where A2 itself reports them, but a
      // gate that reports them and a recomputation that does not is a mismatch,
      // not a pass: the field list is taken from A2's side.
      const fields = ["numerator", "denominator"];
      if (a !== null && typeof a === "object") {
        if (a.substantiveNumerator !== undefined) fields.push("substantiveNumerator");
        if (a.substantiveDenominator !== undefined) fields.push("substantiveDenominator");
      }
      const mismatched = fields.filter((f) => {
        const rv = r === null ? undefined : r[f];
        const av = a === null ? undefined : a[f];
        return !(typeof rv === "number" && typeof av === "number" && rv === av);
      });
      conditions.push(
        condition(
          `${prefix}.aggregateRecomputation.${id}.equalsA2`,
          CONDITION_CLASS.CONTENT,
          mismatched.length === 0,
          mismatched.length === 0
            ? `recomputed ${id} figures equal A2's over ${fields.join(", ")}`
            : `recomputed ${id} disagrees with A2 on ${mismatched
                .map((f) => `${f} (recomputed ${JSON.stringify(r === null ? null : r[f] ?? null)} vs A2 ${JSON.stringify(a === null ? null : a[f] ?? null)})`)
                .join(", ")}${
                id === "G2" && (mismatched.includes("substantiveNumerator") || mismatched.includes("substantiveDenominator"))
                  ? `. ${spec.gatesCoveredNote ?? ""}`
                  : ""
              }`
        )
      );
    }
  }

  return conditions;
}

/**
 * D3 as the owner stated it: the clause verbatim AND the flag AND one NAMED
 * alternative, (i) expectations fixed before the runtime was measured, or (ii)
 * reproduced against an unseen or holdout corpus. V1 kept only the flag, which
 * is necessary but not sufficient. The clause and the flag are checked by
 * antiCircularityConditions; this adds the disjunction.
 */
export function antiCircularityAlternativeConditions(art, prefix, gi, states = null) {
  const spec = gi.criteria?.criteria?.standaloneAndIntegratedExactGates?.antiCircularity ?? null;
  const alternatives = spec?.alternatives ?? null;
  const validIds = alternatives !== null && typeof alternatives === "object" ? Object.keys(alternatives) : [];
  const ac = art?.antiCircularity ?? null;
  const chosen = typeof ac?.satisfiedByAlternative === "string" ? ac.satisfiedByAlternative : null;
  const evidence = ac?.alternativeEvidence ?? null;
  const evidenceIsRecord = evidence !== null && typeof evidence === "object" && !Array.isArray(evidence);
  const supporting =
    evidenceIsRecord && states instanceof Map
      ? [...states.values()].find((state) => state.verified === true && deepEqual(state.got, evidence)) ?? null
      : null;
  // Digest verification proves which bytes were read; it does not prove that
  // statements made by the author of those bytes are historically independent
  // of the runtime measurement. Inspect the retained, already-verified parse so
  // the record is not treated as an opaque digest, but do not invent a timestamp,
  // corpus-label or self-attestation schema that the pinned criteria never
  // authorized. A separately governed provenance/admission definition is the
  // only truthful route by which either D3 alternative can become pass-capable.
  const supportingContent = supporting?.parsedValue ?? null;
  const supportingContentAvailable =
    supportingContent !== null && typeof supportingContent === "object" && !Array.isArray(supportingContent);

  return [
    condition(
      `${prefix}.antiCircularity.disjunctionDefined`,
      CONDITION_CLASS.DEFINITION,
      validIds.length >= 2,
      validIds.length >= 2
        ? `approved criteria declare alternatives ${validIds.join(" / ")}`
        : "the pinned approved criteria declare no criterion-4 anti-circularity alternatives, so the (i)/(ii) disjunction has no executable definition"
    ),
    condition(
      `${prefix}.antiCircularity.alternativeNamed`,
      CONDITION_CLASS.CONTENT,
      chosen !== null && validIds.includes(chosen),
      chosen === null
        ? `antiCircularity.satisfiedByAlternative not declared (one of ${validIds.join(" / ") || "i / ii"} required; the expectationFittingUsed flag alone is necessary but not sufficient)`
        : validIds.includes(chosen)
          ? `relies on alternative ${chosen}`
          : `antiCircularity.satisfiedByAlternative = ${JSON.stringify(chosen)} is not one of ${validIds.join(" / ")}`
    ),
    condition(
      `${prefix}.antiCircularity.alternativeEvidenced`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      evidenceIsRecord,
      evidenceIsRecord
        ? "the named alternative carries a structured supporting-record reference"
        : "antiCircularity.alternativeEvidence is absent or narrative-only (the named alternative must be evidenced by a digest-bound supporting record, not prose)"
    ),
    condition(
      `${prefix}.antiCircularity.supportingRecordVerified`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      supporting !== null,
      supporting !== null
        ? `the supporting record is required artifact ${supporting.id}, verified from its LF-normalized digest`
        : "no alternativeEvidence record exactly matches a required artifact declaration whose bytes this gate verified; self-certified fields cannot establish the alternative"
    ),
    condition(
      `${prefix}.antiCircularity.supportingRecordContentAvailable`,
      CONDITION_CLASS.CONTENT,
      supportingContentAvailable,
      supportingContentAvailable
        ? `required artifact ${supporting.id}'s retained digest-verified bytes parse as a record; its self-authored claims confer no D3 provenance`
        : "the matching digest-verified supporting record has no retained parseable record content to inspect"
    ),
    condition(
      `${prefix}.antiCircularity.independentlyVerifiableProvenanceDefinitionAvailable`,
      CONDITION_CLASS.DEFINITION,
      false,
      "the pinned criteria name alternatives (i) and (ii), but define no independent provenance authority, admission record or verification procedure for either. Digest-correct self-authored declarations, timestamps and UNSEEN/HOLDOUT labels cannot establish D3 until a separately governed definition exists"
    )
  ];
}

/**
 * A4 and approved method step 5: a SEPARATE clean lock-verification run whose
 * figures equal A2's field for field.
 *
 * The declared-flag conditions are kept - they carry the author's claim, and a
 * claim that contradicts the figures is worth surfacing - but they no longer
 * stand alone. The figures themselves are compared between the two digest-verified
 * artifacts, so a lock run that produced different numbers cannot be recorded as
 * having reproduced A2.
 */
export function lockVerificationConditions(art, prefix, gi = null, states = null, root = null) {
  const lv = art?.lockVerification ?? null;
  const runDigest =
    typeof art?.runtimeIdentity?.servicesTreeDigest === "string" ? art.runtimeIdentity.servicesTreeDigest : null;
  const lvDigest = typeof lv?.servicesTreeDigest === "string" ? lv.servicesTreeDigest : null;
  const conditions = [
    condition(
      `${prefix}.lockVerification.separateCleanRun`,
      CONDITION_CLASS.CONTENT,
      lv?.separateCleanRun === true,
      `lockVerification.separateCleanRun = ${JSON.stringify(lv?.separateCleanRun ?? null)} (true required; the campaign run cannot verify itself)`
    ),
    condition(
      `${prefix}.lockVerification.reproducedGateSet`,
      CONDITION_CLASS.CONTENT,
      lv?.reproducedA2 === true,
      `lockVerification.reproducedA2 = ${JSON.stringify(lv?.reproducedA2 ?? null)} (true required; the lock run must reproduce the same figures)`
    ),
    condition(
      `${prefix}.lockVerification.sameServicesTreeDigest`,
      CONDITION_CLASS.CONTENT,
      runDigest !== null && lvDigest !== null && runDigest === lvDigest,
      runDigest === null || lvDigest === null
        ? `servicesTreeDigest missing (campaign ${JSON.stringify(runDigest)}, lock run ${JSON.stringify(lvDigest)}); both are required so the two runs provably scored the same bytes`
        : runDigest === lvDigest
          ? "the lock-verification run reproduced the figures from the same verified servicesTreeDigest"
          : `servicesTreeDigest differs: campaign ${runDigest} vs lock run ${lvDigest}`
    ),
    condition(
      `${prefix}.runtimeIdentity.servicesTreeDigestVerified`,
      CONDITION_CLASS.CONTENT,
      art?.runtimeIdentity?.servicesTreeDigestVerified === true,
      `runtimeIdentity.servicesTreeDigestVerified = ${JSON.stringify(art?.runtimeIdentity?.servicesTreeDigestVerified ?? null)} (true required; A1 requires a VERIFIED servicesTreeDigest, not merely a recorded one)`
    )
  ];

  const spec =
    gi?.criteria?.criteria?.standaloneAndIntegratedExactGates?.deterministicVerificationMethod?.a4EqualsA2 ?? null;
  const artifactSpec = gi?.criteria?.criteria?.standaloneAndIntegratedExactGates?.requiredArtifacts?.artifacts ?? null;

  if (spec === null || typeof spec !== "object" || !Array.isArray(spec.comparedFields) || spec.comparedFields.length === 0) {
    conditions.push(
      condition(
        `${prefix}.lockVerification.fieldComparisonDefined`,
        CONDITION_CLASS.DEFINITION,
        false,
        "the pinned approved criteria declare no deterministicVerificationMethod.a4EqualsA2.comparedFields, so step 5's field-for-field comparison has no executable definition and a bare reproducedA2 boolean would be the only evidence of it"
      )
    );
    return conditions;
  }

  const a2 = states instanceof Map ? (states.get("A2") ?? null) : null;
  const a4 = states instanceof Map ? (states.get("A4") ?? null) : null;
  const retainedDoc = (state, label) =>
    state?.verified === true && state.parsedValue !== null
      ? { ok: true, reason: null, value: state.parsedValue }
      : {
          ok: false,
          reason:
            state?.verified !== true
              ? `${label} is not digest-verified`
              : `${label} is not parseable JSON (${state?.parseError ?? "unknown parse error"})`,
          value: null
        };
  const a2Doc = retainedDoc(a2, "A2");
  const a4Doc = retainedDoc(a4, "A4");

  conditions.push(
    condition(
      `${prefix}.lockVerification.a2AndA4Readable`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      a2Doc.ok && a4Doc.ok,
      a2Doc.ok && a4Doc.ok
        ? "A2 and A4 were both read from digest-verified bytes"
        : `step 5 cannot be performed: A2 ${a2Doc.ok ? "read" : `unavailable (${a2Doc.reason})`}, A4 ${
            a4Doc.ok ? "read" : `unavailable (${a4Doc.reason})`
          }`
    )
  );

  const mismatched = [];
  if (a2Doc.ok && a4Doc.ok) {
    for (const f of spec.comparedFields) {
      const av = fieldAt(a2Doc.value, f);
      const bv = fieldAt(a4Doc.value, f);
      // Both sides must be present. Two absent fields must not compare equal, or
      // step 5 would be satisfied by two documents that say nothing.
      if (av === undefined || bv === undefined || av === null || bv === null || av !== bv) {
        mismatched.push(`${f} (A2 ${JSON.stringify(av ?? null)} vs A4 ${JSON.stringify(bv ?? null)})`);
      }
    }
  }

  conditions.push(
    condition(
      `${prefix}.lockVerification.a4EqualsA2FieldForField`,
      CONDITION_CLASS.CONTENT,
      a2Doc.ok && a4Doc.ok && mismatched.length === 0,
      !a2Doc.ok || !a4Doc.ok
        ? `A4 could not be compared to A2 field for field. ${spec.insufficiencyRule ?? ""}`
        : mismatched.length === 0
          ? `A4 equals A2 across all ${spec.comparedFields.length} compared field(s)`
          : `A4 differs from A2 on ${mismatched.length} of ${spec.comparedFields.length} compared field(s): ${mismatched
              .slice(0, 8)
              .join("; ")}${mismatched.length > 8 ? `; and ${mismatched.length - 8} more` : ""}`
    )
  );

  // A2 is declared to be the result artifact recording G1-G12 for this subcheck.
  // If the envelope reports figures its own cited A2 does not carry, the evidence
  // contradicts itself, and the figures would be free-floating envelope fields
  // rather than part of digest-verified bytes.
  const envelopeMismatched = [];
  if (a2Doc.ok) {
    for (const f of spec.comparedFields.filter((f) => f.startsWith("gates."))) {
      const av = fieldAt(a2Doc.value, f);
      const ev = fieldAt(art, f);
      if (ev === undefined) continue;
      if (av === undefined || av === null || av !== ev) {
        envelopeMismatched.push(`${f} (A2 ${JSON.stringify(av ?? null)} vs reported ${JSON.stringify(ev)})`);
      }
    }
  }
  conditions.push(
    condition(
      `${prefix}.lockVerification.a2CarriesReportedFigures`,
      CONDITION_CLASS.CONTENT,
      a2Doc.ok && envelopeMismatched.length === 0,
      !a2Doc.ok
        ? "A2 could not be read, so it cannot be shown to carry the figures this envelope reports"
        : envelopeMismatched.length === 0
          ? "the digest-verified A2 carries every gate figure this envelope reports"
          : `the envelope reports figures its own cited A2 does not carry: ${envelopeMismatched
              .slice(0, 8)
              .join("; ")}${
              envelopeMismatched.length > 8 ? `; and ${envelopeMismatched.length - 8} more` : ""
            }. A2 is declared to be the result artifact recording G1-G12, so a reported figure absent from it is unevidenced.`
    )
  );

  if (spec.cleanRequired !== false) {
    const cleanField = artifactSpec?.A4?.cleanField ?? "clean";
    const cleanValue = a4Doc.ok ? fieldAt(a4Doc.value, cleanField) : undefined;
    conditions.push(
      condition(
        `${prefix}.lockVerification.a4Clean`,
        CONDITION_CLASS.CONTENT,
        cleanValue === true,
        !a4Doc.ok
          ? `A4 could not be read to confirm it ran clean. ${spec.cleanRule ?? ""}`
          : `A4.${cleanField} = ${JSON.stringify(cleanValue ?? null)} (true required; a lock-verification run that itself reported failures reproduces nothing)`
      )
    );
  }

  if (spec.distinctAttemptRequired !== false) {
    const a2Field = artifactSpec?.A2?.attemptIdField ?? "attemptId";
    const a4Field = artifactSpec?.A4?.attemptIdField ?? "attemptId";
    const a2Attempt = a2Doc.ok ? fieldAt(a2Doc.value, a2Field) : undefined;
    const a4Attempt = a4Doc.ok ? fieldAt(a4Doc.value, a4Field) : undefined;
    const haveBoth =
      typeof a2Attempt === "string" && a2Attempt.length > 0 && typeof a4Attempt === "string" && a4Attempt.length > 0;
    conditions.push(
      condition(
        `${prefix}.lockVerification.a4DistinctAttempt`,
        CONDITION_CLASS.CONTENT,
        haveBoth && a2Attempt !== a4Attempt,
        !haveBoth
          ? `A2.${a2Field} = ${JSON.stringify(a2Attempt ?? null)} and A4.${a4Field} = ${JSON.stringify(
              a4Attempt ?? null
            )}; both must be recorded non-empty strings so separateness is checkable. ${spec.cleanRule ?? ""}`
          : a2Attempt === a4Attempt
            ? `A2 and A4 record the same attempt identifier ${JSON.stringify(
                a2Attempt
              )}; one run recorded twice is not a separate clean lock-verification run`
            : "A4 records an attempt identifier distinct from A2's"
      )
    );
  }

  return conditions;
}

/**
 * 4b as the owner defined it: the analyzer reached through the production /ask
 * boundary path rather than a harness-only path, measured locally and
 * in-process. No deployed staging and no external network are required, and
 * neither may be relied upon.
 */
export function integratedBoundaryConditions(art, sub, prefix) {
  const rec = art?.invocationRecord ?? null;
  return [
    condition(
      `${prefix}.boundary.invocationRecordPresent`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      rec !== null && typeof rec === "object",
      rec !== null && typeof rec === "object"
        ? "A5 integrated-path invocation record present"
        : "no invocationRecord declared (A5 requires the integrated-path invocation record)"
    ),
    condition(
      `${prefix}.boundary.invocationPathMatchesContract`,
      CONDITION_CLASS.CONTENT,
      rec?.invocationPath === sub.invocationPath,
      `invocationRecord.invocationPath = ${JSON.stringify(rec?.invocationPath ?? null)} (${JSON.stringify(sub.invocationPath)} required)`
    ),
    condition(
      `${prefix}.boundary.askEntrypointNamed`,
      CONDITION_CLASS.CONTENT,
      rec?.askEntrypoint === "/ask",
      `invocationRecord.askEntrypoint = ${JSON.stringify(rec?.askEntrypoint ?? null)} (the local in-process /ask request-handling entrypoint is required)`
    ),
    condition(
      `${prefix}.boundary.harnessOnlyPathNotUsed`,
      CONDITION_CLASS.CONTENT,
      rec?.harnessOnlyPath === false,
      `invocationRecord.harnessOnlyPath = ${JSON.stringify(rec?.harnessOnlyPath ?? null)} (false required; a harness-only path is subcheck 4a, and one run cannot evidence both)`
    ),
    condition(
      `${prefix}.boundary.inProcess`,
      CONDITION_CLASS.CONTENT,
      rec?.inProcess === true,
      `invocationRecord.inProcess = ${JSON.stringify(rec?.inProcess ?? null)} (true required; 4b is measured locally and in-process before the freeze)`
    ),
    condition(
      `${prefix}.boundary.noDeployedStagingRelied`,
      CONDITION_CLASS.CONTENT,
      rec?.deployedStaging === false,
      `invocationRecord.deployedStaging = ${JSON.stringify(rec?.deployedStaging ?? null)} (false required; a deployed staging environment attributable to a frozen commit is item 5/6 evidence and cannot be a precondition of the criterion the freeze itself is gated on)`
    ),
    condition(
      `${prefix}.boundary.noExternalNetwork`,
      CONDITION_CLASS.CONTENT,
      rec?.externalNetworkUsed === false,
      `invocationRecord.externalNetworkUsed = ${JSON.stringify(rec?.externalNetworkUsed ?? null)} (false required; the approved deterministic verification method forbids network access)`
    ),
    condition(
      `${prefix}.boundary.analyzerNotSubstituted`,
      CONDITION_CLASS.CONTENT,
      rec?.analyzerUnderTestSubstituted === false,
      `invocationRecord.analyzerUnderTestSubstituted = ${JSON.stringify(rec?.analyzerUnderTestSubstituted ?? null)} (false required; deterministic substitution is permitted only OUTSIDE the analyzer boundary, and substituting any part of the analyzer under test voids the subcheck)`
    )
  ];
}

/**
 * 4a and 4b must demonstrably score the SAME analyzer bytes by two different
 * call paths, so the integrated runtime identity must equal the standalone one.
 * Compared here across the two artifacts rather than asserted inside either.
 */
export function runtimeIdentityEqualityConditions(art, standaloneArt, prefix) {
  const mine =
    typeof art?.runtimeIdentity?.analyzerFilesDigest === "string" ? art.runtimeIdentity.analyzerFilesDigest : null;
  const theirs =
    typeof standaloneArt?.runtimeIdentity?.analyzerFilesDigest === "string"
      ? standaloneArt.runtimeIdentity.analyzerFilesDigest
      : null;
  const myServices =
    typeof art?.runtimeIdentity?.servicesTreeDigest === "string" ? art.runtimeIdentity.servicesTreeDigest : null;
  const theirServices =
    typeof standaloneArt?.runtimeIdentity?.servicesTreeDigest === "string"
      ? standaloneArt.runtimeIdentity.servicesTreeDigest
      : null;
  return [
    condition(
      `${prefix}.runtimeIdentity.analyzerFilesDigestDeclared`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      mine !== null,
      mine !== null
        ? "analyzerFilesDigest declared"
        : "runtimeIdentity.analyzerFilesDigest not declared, so 4a and 4b cannot be shown to have scored the same bytes"
    ),
    condition(
      `${prefix}.runtimeIdentity.equalsStandalone`,
      CONDITION_CLASS.CONTENT,
      mine !== null && theirs !== null && mine === theirs,
      theirs === null
        ? "the standalone subcheck declares no runtimeIdentity.analyzerFilesDigest to compare against, so equality cannot be established"
        : mine === null
          ? "the integrated subcheck declares no runtimeIdentity.analyzerFilesDigest"
          : mine === theirs
            ? "the integrated and standalone runs scored the same analyzer bytes by two different call paths"
            : `analyzerFilesDigest differs: integrated ${mine} vs standalone ${theirs} (4a and 4b must score identical bytes)`
    ),
    condition(
      `${prefix}.runtimeIdentity.servicesTreeDigestDeclared`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      myServices !== null,
      myServices !== null
        ? "servicesTreeDigest declared"
        : "runtimeIdentity.servicesTreeDigest not declared, so 4a and 4b cannot be bound to the same governed services tree"
    ),
    condition(
      `${prefix}.runtimeIdentity.servicesTreeDigestEqualsStandalone`,
      CONDITION_CLASS.CONTENT,
      myServices !== null && theirServices !== null && myServices === theirServices,
      theirServices === null
        ? "the standalone subcheck declares no runtimeIdentity.servicesTreeDigest to compare against"
        : myServices === null
          ? "the integrated subcheck declares no runtimeIdentity.servicesTreeDigest"
          : myServices === theirServices
            ? "the integrated and standalone runs used the same governed services tree"
            : `servicesTreeDigest differs: integrated ${myServices} vs standalone ${theirServices}`
    )
  ];
}

/**
 * Fail-closed sequencing detection on the EVIDENCE. A PRE_FREEZE criterion whose
 * artifact carries later-stage fields is refused, and the refusal escalates to
 * SAFE_PAUSE, because a criterion that no evidence can satisfy must not be
 * reported as though evidence were merely missing.
 */
const LATER_STAGE_KEY_PATTERN = /(freeze[_-]?manifest|post[_-]?freeze|staging[_-]?attribut|frozen[_-]?commit)/iu;

// The scan is bounded so a declared artifact cannot make this gate walk an
// adversarially deep or wide document, and the budget outcome is reported as its
// own condition: an incomplete scan must not read as a clean scan.
const LATER_STAGE_SCAN_BUDGET = 20000;

export function laterStageKeysIn(value) {
  const found = new Set();
  const seen = new WeakSet();
  const stack = [{ node: value, at: "" }];
  let examined = 0;
  while (stack.length > 0) {
    const { node, at } = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    const entries = Array.isArray(node)
      ? node.map((child, index) => [String(index), child, `${at}[${index}]`])
      : Object.keys(node).map((key) => [key, node[key], at === "" ? key : `${at}.${key}`]);
    for (const [key, child, here] of entries) {
      if (examined >= LATER_STAGE_SCAN_BUDGET) {
        return { keys: [...found].sort(), complete: false };
      }
      examined += 1;
      // Presence, not truthiness. A key written as null is still a demand for
      // later-stage evidence, and it was the cheapest way to evade the old check.
      if (!Array.isArray(node) && LATER_STAGE_KEY_PATTERN.test(key)) found.add(here);
      stack.push({ node: child, at: here });
    }
  }
  return { keys: [...found].sort(), complete: true };
}

// Contract sequencing cannot rely on the advisory
// itemRequiresFreezeDerivedEvidence map alone. The governed criterion is the
// authority for what its evidence actually requires, including nested subcheck
// boundaries and future requirement keys. Normalize camel/snake/kebab spelling
// before classifying so a new spelling cannot silently evade the ordering gate.
const CRITERIA_LATER_STAGE_TERM_PATTERN =
  /\b(?:freeze(?:\s+(?:manifest|derived))?|post\s+freeze|staging|deployment|frozen\s+commit)\b/u;
const CRITERIA_REQUIREMENT_TERM_PATTERN = /\b(?:requires?|required|requirement|depends?|dependency|must)\b/u;
const CRITERIA_NEGATED_REQUIREMENT_PATTERN =
  /\b(?:must|shall|may|does|do|is|are|was|were|can)\s+not\b|\b(?:cannot|never|neither|without|prohibit\w*|forbid\w*)\b|\bno\s+(?:freeze|post\s+freeze|staging|deployed|deployment)\b/u;

function normalizedRequirementWords(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[_-]+/gu, " ")
    .toLowerCase();
}

function textRequiresLaterStageEvidence(value, requirementContext = false) {
  if (typeof value !== "string") return false;
  const words = normalizedRequirementWords(value);
  return (
    CRITERIA_LATER_STAGE_TERM_PATTERN.test(words) &&
    (requirementContext || CRITERIA_REQUIREMENT_TERM_PATTERN.test(words)) &&
    !CRITERIA_NEGATED_REQUIREMENT_PATTERN.test(words)
  );
}

function criteriaLaterStageRequirementsIn(criterion) {
  if (criterion === null || typeof criterion !== "object" || Array.isArray(criterion)) {
    return { requirements: [], malformed: ["criterion"], complete: true };
  }

  const requirements = new Set();
  const malformed = new Set();
  const declaredRequires = criterion.requires;
  let examined = 0;

  if (!Array.isArray(declaredRequires)) {
    malformed.add("requires");
  } else {
    for (let index = 0; index < declaredRequires.length; index += 1) {
      if (examined >= LATER_STAGE_SCAN_BUDGET) {
        return {
          requirements: [...requirements].sort(),
          malformed: [...malformed].sort(),
          complete: false
        };
      }
      examined += 1;
      const entry = declaredRequires[index];
      if (typeof entry !== "string") {
        malformed.add(`requires[${index}]`);
      } else if (textRequiresLaterStageEvidence(entry, true)) {
        requirements.add(`requires[${index}]`);
      }
    }
  }

  const seen = new WeakSet();
  const stack = [{ node: criterion, at: "", inspectText: false }];
  while (stack.length > 0) {
    const { node, at, inspectText } = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    const isArray = Array.isArray(node);
    const entries = isArray ? node.map((child, index) => [String(index), child]) : Object.entries(node);
    for (const [key, child] of entries) {
      if (examined >= LATER_STAGE_SCAN_BUDGET) {
        return {
          requirements: [...requirements].sort(),
          malformed: [...malformed].sort(),
          complete: false
        };
      }
      examined += 1;
      const here = isArray ? `${at}[${key}]` : at === "" ? key : `${at}.${key}`;
      const childInspectText = inspectText || (at === "" && key === "subChecks");

      if (!isArray) {
        const keyWords = normalizedRequirementWords(key);
        const recognizedLaterStageRequirement =
          CRITERIA_LATER_STAGE_TERM_PATTERN.test(keyWords) &&
          CRITERIA_REQUIREMENT_TERM_PATTERN.test(keyWords);
        if (recognizedLaterStageRequirement) {
          if (child === true) requirements.add(here);
          else if (child !== false) malformed.add(here);
        }
      }

      if (childInspectText && typeof child === "string" && textRequiresLaterStageEvidence(child)) {
        requirements.add(here);
      }
      if (child !== null && typeof child === "object") {
        stack.push({ node: child, at: here, inspectText: childInspectText });
      }
    }
  }

  return {
    requirements: [...requirements].sort(),
    malformed: [...malformed].sort(),
    complete: true
  };
}

export function sequencingInversionConditions(art, sub, prefix) {
  const stage = sub.stage ?? null;
  const idx = stageIndex(stage);
  const scan = laterStageKeysIn(art);
  const explicit =
    art === null || typeof art !== "object"
      ? []
      : LATER_STAGE_EVIDENCE_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(art, f));
  const present = [...new Set([...explicit, ...scan.keys])].sort();
  // An unrecognized stage is treated as possibly-early. Reading it as late would
  // mean a contract typo silently switched the inversion detector off, which is
  // the opposite of fail-closed.
  const isEarlyStage = idx === null || idx < stageIndex(SEQUENCING_STAGE.FREEZE);
  const inverted = isEarlyStage && present.length > 0;
  return [
    condition(
      `${prefix}.sequencing.stageDeclared`,
      CONDITION_CLASS.DEFINITION,
      idx !== null,
      idx !== null
        ? `subcheck stage = ${stage}`
        : `subcheck declares no recognized sequencing stage (one of ${STAGE_ORDER.join(", ")} required)`
    ),
    condition(
      `${prefix}.sequencing.noLaterStageEvidenceFields`,
      CONDITION_CLASS.PRECONDITION,
      !inverted,
      present.length === 0
        ? `evidence carries no later-stage key at any depth (named fields ${LATER_STAGE_EVIDENCE_FIELDS.join(
            ", "
          )}; pattern ${LATER_STAGE_KEY_PATTERN.source})`
        : `evidence for a ${stage} criterion carries later-stage key(s) ${present.join(", ")}. The freeze is gated on this criterion (item 5 precondition P1), so requiring freeze-derived evidence here makes items 4 and 5 each a precondition of the other, and no evidence can satisfy both. Refused as a sequencing inversion rather than evaluated as a content failure.`,
      inverted ? { safePauseRequired: true } : {}
    ),
    condition(
      `${prefix}.sequencing.scanComplete`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      scan.complete,
      scan.complete
        ? "the later-stage key scan traversed the whole evidence document"
        : `the later-stage key scan exhausted its ${LATER_STAGE_SCAN_BUDGET}-node budget, so absence of a later-stage key is not established; an incomplete scan is not a clean scan`
    )
  ];
}

/**
 * Fail-closed sequencing detection on the CONTRACT, independent of any evidence:
 * does the live catalogue itself contain an inversion, and does the pinned
 * criteria artifact agree with the stage this gate assigns? This is the check
 * that would have caught the V1 defect before any evidence existed.
 */
export function contractSequencingConditions(item, gi) {
  const stage = item.stage ?? null;
  const idx = stageIndex(stage);
  // Same fail-closed reading as the evidence detector: an unrecognized stage is
  // possibly-early, so a contract typo cannot switch the inversion check off.
  const isEarly = idx === null || idx < stageIndex(SEQUENCING_STAGE.FREEZE);
  const subs = Array.isArray(item.subChecks) ? item.subChecks : [];
  const offending = subs.filter(
    (s) =>
      s.stagingAttributionRequired === true ||
      s.freezeManifestReferenceRequired === true ||
      s.postFreezeCampaignRequired === true ||
      s.deployedStagingRequired === true
  );
  const inverted = isEarly && offending.length > 0;
  const criterion = gi.criteria?.criteria?.[item.criterionId ?? item.id] ?? null;
  const criteriaStage = criterion?.phase ?? null;
  const modelStage = gi.criteria?.sequencingModel?.itemStage?.[String(item.roadmapItem)] ?? null;
  const freezeDerived =
    gi.criteria?.sequencingModel?.itemRequiresFreezeDerivedEvidence?.[String(item.roadmapItem)];
  const classificationDeclared = typeof freezeDerived === "boolean";
  const classificationCompatible = classificationDeclared && !(isEarly && freezeDerived === true);
  const criteriaRequirements = criteriaLaterStageRequirementsIn(criterion);
  if (
    subs.length > 0 &&
    (criterion?.subChecks === null ||
      typeof criterion?.subChecks !== "object" ||
      Array.isArray(criterion?.subChecks))
  ) {
    criteriaRequirements.malformed.push("subChecks");
    criteriaRequirements.malformed.sort();
  }
  const criteriaContentInverted = isEarly && criteriaRequirements.requirements.length > 0;
  const criteriaContentCompatible =
    criteriaRequirements.complete &&
    criteriaRequirements.malformed.length === 0 &&
    !criteriaContentInverted;

  return [
    condition(
      "sequencing.contractStageDeclared",
      CONDITION_CLASS.DEFINITION,
      idx !== null,
      idx !== null ? `item stage = ${stage}` : "contract item declares no recognized sequencing stage"
    ),
    condition(
      "sequencing.noLaterStageRequirementInEarlierStage",
      CONDITION_CLASS.PRECONDITION,
      !inverted,
      offending.length === 0
        ? `no ${stage} subcheck requires freeze-derived, post-freeze or deployed-staging evidence`
        : `${stage} subcheck(s) ${offending.map((s) => s.id).join(", ")} require later-stage evidence. This is the V1 defect: the freeze is gated on this criterion, so the criterion cannot be gated on the freeze.`,
      inverted ? { safePauseRequired: true } : {}
    ),
    condition(
      "sequencing.criteriaContentNoLaterStageRequirementInEarlierStage",
      CONDITION_CLASS.PRECONDITION,
      criteriaContentCompatible,
      !criteriaRequirements.complete
        ? `the pinned criterion requirement scan exhausted its ${LATER_STAGE_SCAN_BUDGET}-node budget; absence of a later-stage requirement is not established`
        : criteriaRequirements.malformed.length > 0
          ? `the pinned criterion carries malformed or unsupported requirement declaration(s): ${criteriaRequirements.malformed.join(", ")}`
          : criteriaContentInverted
            ? `the ${stage} pinned criterion requires later-stage evidence at ${criteriaRequirements.requirements.join(", ")}; advisory classification flags cannot override the criterion's own content`
            : `the pinned criterion content declares no later-stage evidence requirement incompatible with ${stage}`,
      !criteriaContentCompatible ? { safePauseRequired: true } : {}
    ),
    condition(
      "sequencing.criteriaAgreeOnStage",
      CONDITION_CLASS.DEFINITION,
      criteriaStage !== null && criteriaStage === stage,
      `contract stage ${JSON.stringify(stage)} vs pinned criteria phase ${JSON.stringify(criteriaStage)}`
    ),
    condition(
      "sequencing.criteriaSequencingModelAgrees",
      CONDITION_CLASS.DEFINITION,
      modelStage !== null && modelStage === stage,
      `contract stage ${JSON.stringify(stage)} vs pinned criteria sequencingModel.itemStage[${item.roadmapItem}] ${JSON.stringify(modelStage)}`
    ),
    condition(
      "sequencing.freezeDerivedEvidenceClassificationDeclared",
      CONDITION_CLASS.DEFINITION,
      classificationDeclared,
      classificationDeclared
        ? `itemRequiresFreezeDerivedEvidence[${item.roadmapItem}] = ${freezeDerived}`
        : `pinned criteria declare no boolean itemRequiresFreezeDerivedEvidence[${item.roadmapItem}]`
    ),
    condition(
      "sequencing.freezeDerivedEvidenceStageCompatible",
      CONDITION_CLASS.PRECONDITION,
      classificationCompatible,
      !classificationDeclared
        ? "freeze-derived-evidence classification is unavailable, so stage compatibility cannot be established"
        : classificationCompatible
          ? `${stage} is compatible with itemRequiresFreezeDerivedEvidence=${freezeDerived}`
          : `${stage} is earlier than FREEZE while itemRequiresFreezeDerivedEvidence=true; no evidence can satisfy that ordering`,
      !classificationCompatible && classificationDeclared ? { safePauseRequired: true } : {}
    )
  ];
}

// ── New check: EXACT_GATE_RESULT (roadmap item 4 subchecks) ─────────────────

function checkExactGateResult(sub, root, gi, standaloneArt = null) {
  const prefix = `exactGate.${sub.id}`;
  const found = readJsonUnderRoot(root, sub.evidenceSource);
  const art = found.value ?? null;
  // Resolved once: three of the six approved method steps need the same declared
  // artifact paths, digests and bytes.
  const artStates = requiredArtifactStates(art, sub, gi, root);
  const conditions = [
    condition(
      `${prefix}.present`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      found.present === true,
      found.present ? `${sub.evidenceSource} present` : `${sub.evidenceSource} not found`
    ),
    condition(
      `${prefix}.parsed`,
      CONDITION_CLASS.CONTENT,
      found.present === true && art !== null,
      found.present === false
        ? "no exact-gate artifact to parse"
        : art !== null
          ? "exact-gate artifact parsed"
          : `exact-gate artifact unparseable: ${found.parseError}`
    ),
    condition(
      `${prefix}.envelopeMatchesContract`,
      CONDITION_CLASS.CONTENT,
      art?.envelope === sub.envelope,
      `artifact envelope = ${JSON.stringify(art?.envelope ?? null)} (${JSON.stringify(
        sub.envelope
      )} required, so a V1-shaped exact-gate artifact cannot be read as V2 evidence)`
    ),
    condition(
      `${prefix}.modeMatchesSubcheck`,
      CONDITION_CLASS.CONTENT,
      art?.mode === sub.mode,
      `artifact mode = ${JSON.stringify(art?.mode ?? null)} (${sub.mode} required, so a standalone result can never be read as the integrated one)`
    ),
    condition(
      `${prefix}.semantics`,
      CONDITION_CLASS.CONTENT,
      art?.semantics === EXPECTED_SEMANTICS.RELATION,
      `semantics = ${JSON.stringify(art?.semantics ?? null)} (${EXPECTED_SEMANTICS.RELATION} required)`
    ),
    ...exactCountConditions(art?.counts ?? null, prefix),
    condition(
      `${prefix}.verdictExact`,
      CONDITION_CLASS.CONTENT,
      art?.verdict === "EXACT",
      `verdict = ${JSON.stringify(art?.verdict ?? null)} (EXACT required)`
    ),
    // V2: the freeze-manifest-by-digest and post-freeze-campaign conditions that
    // stood here are REMOVED, not relaxed. Item 4 is the criterion the freeze is
    // gated on (item 5 precondition P1), so requiring freeze-derived evidence
    // here made items 4 and 5 each a precondition of the other. The obligations
    // are not dropped: they are enforced at the stage the owner assigned them, by
    // checkFreezeManifestExact (item 5) and checkPostFreezeCampaignLedger (item
    // 6), both unchanged. An item-4 artifact that carries those fields anyway is
    // refused by sequencingInversionConditions rather than silently accepted.
    ...sequencingInversionConditions(art, sub, prefix),
    ...exactGateSetConditions(art, prefix, gi),
    ...requiredArtifactConditions(art, sub, prefix, gi, root, artStates),
    ...servicesTreeDigestConditions(art, prefix, gi, root),
    ...aggregateRecomputationConditions(art, prefix, gi, artStates, root),
    ...lockVerificationConditions(art, prefix, gi, artStates, root),
    ...antiCircularityConditions(art, prefix),
    ...antiCircularityAlternativeConditions(art, prefix, gi, artStates)
  ];

  // V2: 4b is the INTEGRATED subcheck, measured locally and in-process through
  // the /ask boundary BEFORE the freeze, so it carries a boundary and
  // runtime-identity obligation instead of a staging-attribution one. D6's
  // staging attribution is not weakened: it remains in full on items 5 and 6,
  // which is where the owner placed it.
  if (sub.mode === "INTEGRATED") {
    conditions.push(
      ...integratedBoundaryConditions(art, sub, prefix),
      ...runtimeIdentityEqualityConditions(art, standaloneArt, prefix)
    );
  }

  // Retained verbatim, but the V2 contract sets stagingAttributionRequired false
  // on both item-4 subchecks, so this block is unreachable from item 4. It is
  // left in place deliberately: if a future contract revision re-enables it, the
  // check it implies is still the one D6 approved rather than a re-derived
  // approximation, and contractSequencingConditions - not a silent absence - is
  // what refuses the inversion.
  if (sub.stagingAttributionRequired === true) {
    const attribution = art?.stagingAttribution ?? null;
    const frozenCommit = frozenCommitOf(gi.freeze);
    conditions.push(
      condition(
        `${prefix}.stagingAttribution.environmentIsStaging`,
        CONDITION_CLASS.CONTENT,
        attribution?.environment === "staging",
        `stagingAttribution.environment = ${JSON.stringify(attribution?.environment ?? null)} (staging required; production is out of scope, D6)`
      ),
      condition(
        `${prefix}.stagingAttribution.attributedToFrozenCommit`,
        CONDITION_CLASS.CONTENT,
        frozenCommit !== null && attribution?.attributedCommit === frozenCommit,
        frozenCommit === null
          ? "freeze manifest declares no resolvable frozenCommit to attribute the staging deployment to"
          : `stagingAttribution.attributedCommit = ${JSON.stringify(attribution?.attributedCommit ?? null)} (frozenCommit ${frozenCommit} required)`
      ),
      condition(
        `${prefix}.stagingAttribution.methodAndEvidenceNamed`,
        CONDITION_CLASS.CONTENT,
        typeof attribution?.attributionMethod === "string" &&
          attribution.attributionMethod.length > 0 &&
          typeof attribution?.attributionEvidence === "string" &&
          attribution.attributionEvidence.length > 0,
        `attributionMethod = ${JSON.stringify(attribution?.attributionMethod ?? null)}, attributionEvidence = ${JSON.stringify(
          attribution?.attributionEvidence ?? null
        )} (attribution must name its method and its evidence, not merely assert a match)`
      ),
      condition(
        `${prefix}.stagingAttribution.verified`,
        CONDITION_CLASS.CONTENT,
        attribution?.verified === true,
        `stagingAttribution.verified = ${JSON.stringify(attribution?.verified ?? null)} (true required)`
      )
    );
  }

  const result = statusFromConditions(conditions, sub.id);
  // The parsed artifact travels with the result so the integrated subcheck can be
  // compared against the standalone one without a second read.
  return { ...result, artifact: art };
}

/**
 * D2: one roadmap criterion, two mandatory subchecks. The governed-input and
 * definition preconditions are evaluated ONCE at the item level, so a missing
 * authorization is reported once rather than twice, and the subcheck statuses
 * are combined by A15 V1's own precedence via worstStatus.
 */
function checkStandaloneAndIntegratedExactGates(item, root, gi) {
  const itemLevel = [
    ...governedInputConditions(gi),
    ...criterionDefinitionConditions(gi, item),
    ...contractSequencingConditions(item, gi)
  ];

  // 4a is evaluated first and its artifact is handed to 4b, because 4b must be
  // shown to have scored the SAME analyzer bytes by a different call path. The
  // order is derived from the declared modes rather than from catalogue position,
  // and an integrated subcheck with no standalone counterpart sees null and fails
  // the equality condition rather than skipping it.
  const evaluationOrder = [...item.subChecks].sort(
    (a, b) => (a.mode === "STANDALONE" ? 0 : 1) - (b.mode === "STANDALONE" ? 0 : 1)
  );
  const byId = new Map();
  for (const sub of evaluationOrder) {
    const standaloneArt =
      sub.mode === "INTEGRATED"
        ? (item.subChecks
            .filter((s) => s.mode === "STANDALONE")
            .map((s) => byId.get(s.id)?.artifact ?? null)
            .find((a) => a !== null) ?? null)
        : null;
    const out = checkExactGateResult(sub, root, gi, standaloneArt);
    byId.set(sub.id, { id: sub.id, roadmapWording: sub.roadmapWording, ...out });
  }
  const subCheckResults = item.subChecks.map((sub) => {
    const { artifact, ...rest } = byId.get(sub.id);
    return rest;
  });

  const structural = condition(
    "exactGates.bothSubchecksMandatory",
    CONDITION_CLASS.DEFINITION,
    item.structure === "ONE_CRITERION_TWO_MANDATORY_SUBCHECKS" && subCheckResults.length === 2,
    `structure = ${JSON.stringify(item.structure)} with ${subCheckResults.length} subchecks (D2 requires exactly two, both mandatory; neither satisfies the criterion alone)`
  );

  const itemLevelStatus = statusFromConditions([...itemLevel, structural], item.id);
  const status = worstStatus([itemLevelStatus.status, ...subCheckResults.map((r) => r.status)]);
  const safePause = [
    ...itemLevelStatus.safePause,
    ...subCheckResults.flatMap((r) => r.safePause ?? [])
  ];

  return {
    status,
    detail:
      status === ITEM_STATUS.PASS
        ? "both mandatory subchecks pass and every item-level precondition is satisfied"
        : `${itemLevelStatus.detail}; subchecks: ${subCheckResults.map((r) => `${r.id}=${r.status}`).join(", ")}`,
    conditions: [...itemLevel, structural],
    subCheckResults,
    safePause
  };
}

// ── New check: FREEZE_MANIFEST_EXACT (roadmap item 5) ───────────────────────
//
// D5 is the reason this runner is allowed a subprocess: a freeze digest is the
// SHA-256 of the COMMITTED blob at the frozen commit, and on a core.autocrlf
// checkout the working tree does not hold those bytes. Every declared digest is
// recomputed here from git's own object store, so reusing the WS1 digests
// instead of taking digests at the frozen commit cannot pass.

/**
 * Item 5 precondition P1: criterion 4 must already be SATISFIED, on BOTH
 * subchecks. Resolved from the live evaluation rather than from a self-report in
 * the freeze manifest, because a manifest asserting its own precondition proves
 * nothing. Fail-closed in every degenerate case: no context, no such item, an
 * unresolvable status, or a dependency cycle all leave P1 unmet.
 */
export function freezePreconditionP1Conditions(item, ctx, prefix, label = "P1") {
  const dependsOn = Array.isArray(item.dependsOnItems) ? item.dependsOnItems : [];

  if (dependsOn.length === 0) {
    return [
      condition(
        `${prefix}.${label}.dependencyDeclared`,
        CONDITION_CLASS.DEFINITION,
        false,
        `the contract declares no dependsOnItems for ${item.id}, so precondition ${label} has no executable definition`
      )
    ];
  }

  if (ctx === null || ctx === undefined || typeof ctx.statusOf !== "function") {
    return [
      condition(
        `${prefix}.${label}.dependencyDeclared`,
        CONDITION_CLASS.DEFINITION,
        true,
        `${item.id} depends on ${dependsOn.join(", ")}`
      ),
      condition(
        `${prefix}.${label}.resolvable`,
        CONDITION_CLASS.PRECONDITION,
        false,
        "no evaluation context was supplied, so the status of the criterion the freeze depends on cannot be resolved; P1 is unmet rather than assumed"
      )
    ];
  }

  const conditions = [
    condition(
      `${prefix}.${label}.dependencyDeclared`,
      CONDITION_CLASS.DEFINITION,
      true,
      `${item.id} depends on ${dependsOn.join(", ")}`
    )
  ];

  for (const depId of dependsOn) {
    const dep = ctx.statusOf(depId);
    const subs = Array.isArray(dep.outcome?.subCheckResults) ? dep.outcome.subCheckResults : null;
    const failing = subs === null ? null : subs.filter((s) => s.status !== ITEM_STATUS.PASS);
    // Whether the dependency is a multi-subcheck item is a property of the
    // contract, not of the evidence. Requiring two passing subchecks from an item
    // that declares none would fail the dependent item for a reason that has
    // nothing to do with the dependency; requiring them from an item that DOES
    // declare them is exactly P1 as the owner stated it.
    const depItem =
      typeof ctx.itemOf === "function"
        ? ctx.itemOf(depId)
        : (SUCCESSOR_CONTRACT.exitItems.find((i) => i.id === depId) ?? null);
    const depDeclaresSubChecks = Array.isArray(depItem?.subChecks) && depItem.subChecks.length > 0;
    const declaredSubcheckIds = depDeclaresSubChecks ? depItem.subChecks.map((sub) => sub.id) : [];
    const observedSubcheckIds = subs === null ? [] : subs.map((sub) => sub?.id);
    const exactDeclaredSubchecks =
      subs !== null &&
      observedSubcheckIds.length === declaredSubcheckIds.length &&
      new Set(observedSubcheckIds).size === observedSubcheckIds.length &&
      declaredSubcheckIds.every((id) => observedSubcheckIds.includes(id));

    conditions.push(
      condition(
        `${prefix}.${label}.${depId}.noDependencyCycle`,
        CONDITION_CLASS.PRECONDITION,
        dep.cycle !== true,
        dep.cycle === true
          ? `${dep.detail}. Two exit items are each other's precondition, so neither can be reached. Refused rather than resolved by guessing an order.`
          : `no mutual precondition cycle between ${item.id} and the item it depends on`,
        dep.cycle === true ? { safePauseRequired: true } : {}
      ),
      condition(
        `${prefix}.${label}.${depId}.satisfied`,
        CONDITION_CLASS.PRECONDITION,
        dep.status === ITEM_STATUS.PASS,
        dep.status === ITEM_STATUS.PASS
          ? `${depId} is SATISFIED`
          : label === "P1"
            ? `${depId} is ${dep.status}, so no freeze may be taken (P1). B1 applies while this is the state.`
            : `${depId} is ${dep.status}, so ${item.id} cannot be reached`
      )
    );

    if (depDeclaresSubChecks) {
      const wanted = depItem.subChecks.length;
      conditions.push(
        condition(
          `${prefix}.${label}.${depId}.bothSubchecksPass`,
          CONDITION_CLASS.PRECONDITION,
          exactDeclaredSubchecks && failing.length === 0,
          subs === null
            ? `${depId} reported no subcheck results, so it cannot be shown that BOTH subchecks pass; the item-level status alone does not satisfy ${label}`
            : !exactDeclaredSubchecks
              ? `${depId} reported subcheck ids [${observedSubcheckIds.join(", ")}]; ${label} requires each declared id exactly once [${declaredSubcheckIds.join(", ")}]`
              : failing.length === 0
                ? `both ${depId} subchecks pass`
                : `${depId} subcheck(s) not passing: ${failing.map((s) => `${s.id}=${s.status}`).join(", ")}`
        )
      );
    } else {
      conditions.push(
        condition(
          `${prefix}.${label}.${depId}.itemLevelStatusGoverns`,
          CONDITION_CLASS.DEFINITION,
          true,
          `${depId} declares no subchecks, so its item-level status is the whole of the dependency`
        )
      );
    }
  }

  return conditions;
}

/**
 * Item 5 preconditions P2 and P3, read from the freeze artifact's own bytes.
 *
 * P2 is a DECLARED condition rather than a live worktree query. That is a
 * deliberate limit, recorded here so it is not mistaken for a verification: the
 * gate's declared read-only Git-plumbing scope deliberately excludes `git status`,
 * so it cannot query live cleanliness itself. What it can do, and does,
 * is refuse a freeze whose artifact does not declare cleanliness together with
 * the method and evidence behind the claim - so the claim is at least attributable
 * and reviewable. An independent reviewer must still confirm it.
 *
 * P3 is genuinely verified from the manifest bytes: the enumeration must be
 * explicit by path, with no wildcard, glob or directory entry standing in for a
 * file list. The exact-set equality against the approved 26-path set is checked
 * separately and is unchanged.
 */
export function freezePreconditionP2P3Conditions(man, declaredPaths, prefix) {
  const clean = man?.worktreeCleanAtFreeze ?? null;
  const mode = man?.runtimeFileSetEnumeration ?? null;
  const suspicious =
    declaredPaths === null
      ? null
      : declaredPaths.filter((p) => p.includes("*") || p.includes("?") || p.endsWith("/") || p.trim() === "");

  return [
    condition(
      `${prefix}.P2.declared`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      clean !== null && typeof clean === "object",
      clean !== null && typeof clean === "object"
        ? "worktreeCleanAtFreeze declared"
        : "worktreeCleanAtFreeze not declared (P2 requires the freeze artifact to record that the tracked worktree was clean at the moment of the freeze)"
    ),
    condition(
      `${prefix}.P2.clean`,
      CONDITION_CLASS.PRECONDITION,
      clean?.clean === true,
      `worktreeCleanAtFreeze.clean = ${JSON.stringify(clean?.clean ?? null)} (true required; a freeze taken over a dirty tracked worktree does not identify the bytes it claims to freeze)`
    ),
    condition(
      `${prefix}.P2.methodAndEvidenceNamed`,
      CONDITION_CLASS.CONTENT,
      typeof clean?.method === "string" &&
        clean.method.length > 0 &&
        typeof clean?.evidence === "string" &&
        clean.evidence.length > 0,
      `worktreeCleanAtFreeze.method = ${JSON.stringify(clean?.method ?? null)}, .evidence = ${JSON.stringify(clean?.evidence ?? null)} (both required; this gate cannot query the worktree itself, so an unattributed cleanliness claim is not accepted)`
    ),
    condition(
      `${prefix}.P3.enumerationExplicitByPath`,
      CONDITION_CLASS.PRECONDITION,
      mode === "EXPLICIT_BY_PATH",
      `runtimeFileSetEnumeration = ${JSON.stringify(mode)} ("EXPLICIT_BY_PATH" required; P3 requires the frozen file set to be enumerated explicitly by path in the freeze artifact)`
    ),
    condition(
      `${prefix}.P3.noWildcardOrDirectoryEntries`,
      CONDITION_CLASS.CONTENT,
      suspicious !== null && suspicious.length === 0,
      suspicious === null
        ? "no governedRuntimeSet paths to inspect"
        : suspicious.length === 0
          ? `all ${declaredPaths.length} declared entries are literal file paths`
          : `entries that are not literal file paths: ${suspicious.join(", ")} (a glob or directory entry is not an explicit enumeration)`
    )
  ];
}

const ITEM5_GIT_BUFFER = 1 << 26;
const ITEM5_BLOB_BUFFER = 1 << 27;
const ITEM5_BATCH_BUFFER = 1 << 29;
const ITEM5_HISTORY_COMMIT_LIMIT = 10000;
const ITEM5_HISTORY_BLOB_LIMIT = 200000;
const ITEM5_HISTORY_BYTE_LIMIT = 1 << 29;
const FULL_COMMIT_RE = /^[0-9a-f]{40}$/iu;
const SHA256_RE = /^[0-9a-f]{64}$/u;
const MACHINE_READABLE_EXTENSIONS = new Set([
  ".json", ".jsonl", ".js", ".cjs", ".mjs", ".jsx", ".ts", ".tsx", ".yaml", ".yml"
]);

function item5Git(root, args, { maxBuffer = ITEM5_GIT_BUFFER, input = undefined } = {}) {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: null,
    maxBuffer,
    input,
    windowsHide: true,
    env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1" }
  });
  const stderr = result.stderr ? result.stderr.toString("utf8").trim() : "";
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      status: result.status,
      stdout: result.stdout ?? Buffer.alloc(0),
      detail: result.error?.message ?? (stderr || `git exited ${String(result.status)}`)
    };
  }
  return { ok: true, status: 0, stdout: result.stdout ?? Buffer.alloc(0), detail: "ok" };
}

/**
 * Parse one `git cat-file --batch` response against the requested specs.
 *
 * Whole-batch fail-closed: any truncated header, non-blob answer, invalid or
 * over-budget size, malformed terminator, cardinality mismatch, or trailing
 * byte after the final answer invalidates EVERY requested answer, including
 * entries whose bytes already parsed cleanly. A previously parsed ok entry
 * from a malformed batch must never survive to satisfy a downstream control.
 */
export function parseItem5GitBatchAnswers(specs, stdout) {
  const answers = [];
  let offset = 0;
  let anomaly = null;
  for (const spec of specs) {
    const newline = stdout.indexOf(10, offset);
    if (newline === -1) {
      anomaly = anomaly ?? `${spec}: truncated Git batch header`;
      answers.push({ ok: false, oid: null, bytes: null, detail: anomaly });
      offset = stdout.length;
      continue;
    }
    const header = stdout.subarray(offset, newline).toString("utf8");
    offset = newline + 1;
    const parts = header.split(" ");
    if (parts.length !== 3 || parts[1] !== "blob" || !/^[0-9a-f]{40,64}$/u.test(parts[0]) || !/^\d+$/u.test(parts[2])) {
      anomaly = anomaly ?? `${spec}: Git batch reported ${JSON.stringify(header)}`;
      answers.push({ ok: false, oid: null, bytes: null, detail: anomaly });
      continue;
    }
    const size = Number(parts[2]);
    if (!Number.isSafeInteger(size) || size < 0 || size > ITEM5_BLOB_BUFFER || offset + size >= stdout.length) {
      anomaly = anomaly ?? `${spec}: invalid or over-budget Git blob size ${parts[2]}`;
      answers.push({ ok: false, oid: null, bytes: null, detail: anomaly });
      offset = stdout.length;
      continue;
    }
    const bytes = stdout.subarray(offset, offset + size);
    offset += size;
    if (stdout[offset] !== 10) {
      anomaly = anomaly ?? `${spec}: malformed Git batch blob terminator`;
      answers.push({ ok: false, oid: null, bytes: null, detail: anomaly });
      offset = stdout.length;
      continue;
    }
    offset += 1;
    answers.push({ ok: true, oid: parts[0], bytes, detail: `${spec} resolved as blob ${parts[0]}` });
  }
  if (anomaly !== null || offset !== stdout.length) {
    const reason = anomaly !== null
      ? `${anomaly}; whole Git batch invalidated`
      : `Git batch response carries trailing bytes beyond ${specs.length} answer(s); whole Git batch invalidated`;
    return {
      wholeBatchValid: false,
      anomaly: reason,
      answers: specs.map((spec) => ({ ok: false, oid: null, bytes: null, detail: `${spec}: ${reason}` }))
    };
  }
  return { wholeBatchValid: true, anomaly: null, answers };
}

function item5GitBatch(root, specs) {
  if (!Array.isArray(specs) || specs.length === 0) return [];
  if (specs.length > ITEM5_HISTORY_BLOB_LIMIT || specs.some((spec) =>
    typeof spec !== "string" || spec.length === 0 || spec.includes("\n") || spec.includes("\r") || spec.includes("\0"))) {
    return specs.map(() => ({ ok: false, oid: null, bytes: null, detail: "invalid or over-budget Git batch request" }));
  }
  const result = item5Git(root, ["cat-file", "--batch"], {
    input: Buffer.from(`${specs.join("\n")}\n`, "utf8"),
    maxBuffer: ITEM5_BATCH_BUFFER
  });
  if (!result.ok) {
    return specs.map((spec) => ({ ok: false, oid: null, bytes: null, detail: `${spec}: ${result.detail}` }));
  }
  return parseItem5GitBatchAnswers(specs, result.stdout).answers;
}

function item5ResolvedCommit(root, value) {
  if (typeof value !== "string" || !FULL_COMMIT_RE.test(value)) {
    return { ok: false, commit: null, detail: `${JSON.stringify(value)} is not a full 40-hex commit id` };
  }
  const result = item5Git(root, ["rev-parse", "--verify", `${value}^{commit}`]);
  if (!result.ok) return { ok: false, commit: null, detail: result.detail };
  const commit = result.stdout.toString("utf8").trim().toLowerCase();
  if (!FULL_COMMIT_RE.test(commit) || commit !== value.toLowerCase()) {
    return { ok: false, commit: null, detail: `resolved ${JSON.stringify(commit)} instead of ${value}` };
  }
  return { ok: true, commit, detail: `resolved commit ${commit}` };
}

function item5Head(root) {
  const result = item5Git(root, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (!result.ok) return { ok: false, commit: null, detail: result.detail };
  const commit = result.stdout.toString("utf8").trim().toLowerCase();
  return FULL_COMMIT_RE.test(commit)
    ? { ok: true, commit, detail: `resolved HEAD ${commit}` }
    : { ok: false, commit: null, detail: `HEAD resolved to malformed object name ${JSON.stringify(commit)}` };
}

function item5Ancestor(root, ancestor, descendant) {
  if (!FULL_COMMIT_RE.test(ancestor ?? "") || !FULL_COMMIT_RE.test(descendant ?? "")) {
    return { ok: false, detail: "ancestor relation has no two resolved full commit ids" };
  }
  const result = item5Git(root, ["merge-base", "--is-ancestor", ancestor, descendant]);
  return result.ok
    ? { ok: true, detail: `${ancestor} is an ancestor of ${descendant}` }
    : { ok: false, detail: `${ancestor} is not a provable ancestor of ${descendant}: ${result.detail}` };
}

function item5GitBlob(root, commit, relPath) {
  if (!FULL_COMMIT_RE.test(commit ?? "") || typeof relPath !== "string" || relPath.length === 0) {
    return { ok: false, oid: null, bytes: null, detail: "blob lookup lacks a resolved commit or path" };
  }
  const [result] = item5GitBatch(root, [`${commit}:${CANON.toGitPath(relPath)}`]);
  return result.ok
    ? { ...result, detail: `${relPath} resolves to Git object ${result.oid} at ${commit}` }
    : { ...result, detail: `${relPath} at ${commit}: ${result.detail}` };
}

function exactOrderedPathSet(actual, expected) {
  return Array.isArray(actual) &&
    Array.isArray(expected) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    actual.every((entry, index) => typeof entry === "string" && entry === expected[index]);
}

/** Owner §2.5 F3: exact services-tree identity over committed LF-normalized bytes. */
export function freezeServicesTreeDigestConditions(man, prefix, gi, root, frozenCommit) {
  const family = `${prefix}.servicesTreeDigest`;
  const approvedPaths = gi?.criteria?.frozenGovernedRuntimeSet?.paths;
  const expectedCount = gi?.criteria?.frozenGovernedRuntimeSet?.expectedFileCount;
  const declaredPaths = man?.servicesTreeFileSet;
  const approvedValid = Array.isArray(approvedPaths) &&
    approvedPaths.length === expectedCount &&
    new Set(approvedPaths).size === approvedPaths.length &&
    approvedPaths.every((entry) => typeof entry === "string" && entry.length > 0);
  const fileSetExact = approvedValid && exactOrderedPathSet(declaredPaths, approvedPaths);
  const declaredDigestWellFormed = SHA256_RE.test(man?.servicesTreeDigest ?? "");
  const localPrerequisites = approvedValid && fileSetExact && declaredDigestWellFormed;
  const resolved = localPrerequisites
    ? item5ResolvedCommit(root, frozenCommit)
    : { ok: false, commit: null, detail: "frozen-commit resolution withheld because the services-tree set or digest declaration is invalid" };
  const proofPrerequisites = localPrerequisites && resolved.ok;
  const proofWithheldDetail = "services-tree blob and worktree proof withheld because the approved set, exact declared file set, declared digest, or frozen commit is invalid";

  const blobFailures = [];
  const worktreeFailures = [];
  let recomputed = null;
  if (proofPrerequisites) {
    const hash = createHash("sha256");
    let totalBytes = 0;
    const blobs = item5GitBatch(root, approvedPaths.map((relPath) => `${resolved.commit}:${CANON.toGitPath(relPath)}`));
    for (const [index, relPath] of approvedPaths.entries()) {
      const blob = blobs[index];
      if (!blob.ok) {
        blobFailures.push(blob.detail);
        continue;
      }
      const canonicalBlob = CANON.normalizeToLf(blob.bytes);
      totalBytes += canonicalBlob.length;
      if (totalBytes > ITEM5_HISTORY_BYTE_LIMIT) {
        blobFailures.push(`services tree exceeds the ${ITEM5_HISTORY_BYTE_LIMIT}-byte verification budget`);
        break;
      }
      hash.update(canonicalBlob);
      const worktree = topLevelRead(root, relPath, { kind: "F3_GOVERNED_RUNTIME", maxBytes: ITEM5_BLOB_BUFFER });
      if (!worktree.ok) {
        worktreeFailures.push(`${relPath}: ${worktree.reason}`);
      } else if (!CANON.normalizeToLf(worktree.bytes).equals(canonicalBlob)) {
        worktreeFailures.push(`${relPath}: canonical worktree bytes differ from the frozen Git blob`);
      }
    }
    if (blobFailures.length === 0) recomputed = hash.digest("hex");
  }

  return [
    condition(
      `${family}.approvedExactUniqueSetAvailable`,
      CONDITION_CLASS.DEFINITION,
      approvedValid,
      approvedValid ? `approved exact ordered ${approvedPaths.length}-path set is available` : "approved 26-path set is missing, malformed, or non-unique"
    ),
    condition(
      `${family}.fileSetExactOrderedEquality`,
      CONDITION_CLASS.CONTENT,
      fileSetExact,
      fileSetExact
        ? `servicesTreeFileSet equals the approved ${approvedPaths.length}-path order exactly`
        : "servicesTreeFileSet is missing, reordered, duplicated, substituted, incomplete, or contains extras"
    ),
    condition(`${family}.frozenCommitResolvable`, CONDITION_CLASS.CONTENT, resolved.ok, resolved.detail),
    condition(
      `${family}.allFrozenBlobsResolvable`,
      CONDITION_CLASS.CONTENT,
      proofPrerequisites && blobFailures.length === 0 && recomputed !== null,
      !proofPrerequisites
        ? proofWithheldDetail
        : blobFailures.length === 0
          ? "every approved services-tree blob resolved within bounds"
          : blobFailures.join(" | ")
    ),
    condition(
      `${family}.digestRecomputedFromFrozenBlobs`,
      CONDITION_CLASS.CONTENT,
      proofPrerequisites && recomputed !== null && man.servicesTreeDigest === recomputed,
      !proofPrerequisites
        ? proofWithheldDetail
        : recomputed === null
        ? "servicesTreeDigest could not be recomputed"
        : `declared ${JSON.stringify(man?.servicesTreeDigest ?? null)}; recomputed ${recomputed}`
    ),
    condition(
      `${family}.noCanonicalWorktreeDrift`,
      CONDITION_CLASS.CONTENT,
      proofPrerequisites && blobFailures.length === 0 && recomputed !== null && worktreeFailures.length === 0,
      !proofPrerequisites
        ? proofWithheldDetail
        : blobFailures.length > 0
          ? `worktree comparison incomplete because frozen blob proof failed: ${blobFailures.join(" | ")}`
          : worktreeFailures.length === 0
            ? "canonical worktree bytes equal every frozen services-tree blob"
            : worktreeFailures.join(" | ")
    )
  ];
}

function item5HistoryEnvironment(root) {
  const shallow = item5Git(root, ["rev-parse", "--is-shallow-repository"]);
  const replaceRefs = item5Git(root, ["for-each-ref", "--format=%(refname)", "refs/replace"]);
  const shallowOk = shallow.ok && shallow.stdout.toString("utf8").trim() === "false";
  const replaceRefNames = replaceRefs.ok ? replaceRefs.stdout.toString("utf8").trim() : "";
  const replaceEnv = typeof process.env.GIT_REPLACE_REF_BASE === "string" && process.env.GIT_REPLACE_REF_BASE.length > 0;
  return {
    ok: shallowOk && replaceRefs.ok && replaceRefNames.length === 0 && !replaceEnv,
    detail: !shallowOk
      ? `complete history unavailable: ${shallow.detail}`
      : replaceRefNames.length > 0
        ? `replace-object refs are active: ${replaceRefNames}`
        : replaceEnv
          ? "GIT_REPLACE_REF_BASE is active"
          : replaceRefs.ok
            ? "history is complete and no replace-object refs or environment are active"
            : `replace-object state unverifiable: ${replaceRefs.detail}`
  };
}

function parsedRuntimeMutableFalse(value, maxNodes = 100000) {
  const stack = [value];
  let examined = 0;
  while (stack.length > 0) {
    if (examined >= maxNodes) return { found: false, bounded: false };
    examined += 1;
    const current = stack.pop();
    if (current === null || typeof current !== "object") continue;
    if (Object.prototype.hasOwnProperty.call(current, "runtimeMutable") && current.runtimeMutable === false) {
      return { found: true, bounded: true };
    }
    for (const value of Object.values(current)) stack.push(value);
  }
  return { found: false, bounded: true };
}

function machineReadableRuntimeFalse(bytes) {
  const text = bytes.toString("utf8");
  const quotedPropertyFalse = /["']runtimeMutable["']\s*:\s*false(?=\s*[,}\]])/u.test(text);
  try {
    const parsed = parsedRuntimeMutableFalse(JSON.parse(text));
    return { found: parsed.found || quotedPropertyFalse, bounded: parsed.bounded };
  } catch {
    // A JS/object artifact can be machine-readable without being standalone JSON.
  }
  return {
    found: /(?:["']runtimeMutable["']|\bruntimeMutable\b)\s*:\s*false(?=\s*[,}\]])/u.test(text),
    bounded: true
  };
}

function jsonPropertyOccurrenceCount(bytes, propertyName) {
  const text = bytes.toString("utf8");
  let count = 0;
  let index = 0;
  while (index < text.length) {
    if (text[index] !== '"') {
      index += 1;
      continue;
    }
    const start = index;
    index += 1;
    let escaped = false;
    while (index < text.length) {
      const ch = text[index];
      index += 1;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        break;
      }
    }
    if (index > text.length || text[index - 1] !== '"') {
      return { ok: false, count, detail: `unterminated JSON string while counting ${propertyName}` };
    }
    let decoded;
    try {
      decoded = JSON.parse(text.slice(start, index));
    } catch (error) {
      return { ok: false, count, detail: `invalid JSON string token while counting ${propertyName}: ${error.message}` };
    }
    let after = index;
    while (after < text.length && /\s/u.test(text[after])) after += 1;
    if (text[after] === ":" && decoded === propertyName) count += 1;
  }
  return { ok: true, count, detail: `${propertyName} occurs as a quoted JSON property ${count} time(s)` };
}

function scanReachableHistoryForPriorRuntimeFalse(root, headCommit, governedFreezeRecord) {
  if (!governedFreezeRecord?.oid || !Buffer.isBuffer(governedFreezeRecord?.bytes)) {
    return { ok: false, findings: [], detail: "the committed governed freeze-record object identity is unavailable" };
  }
  const governedBlob = item5Git(root, ["cat-file", "blob", governedFreezeRecord.oid], { maxBuffer: ITEM5_BLOB_BUFFER });
  if (!governedBlob.ok || !governedBlob.stdout.equals(governedFreezeRecord.bytes)) {
    return {
      ok: false,
      findings: [],
      detail: governedBlob.ok
        ? "the governed freeze-record OID does not reproduce the committed HEAD freeze-record bytes"
        : `the governed freeze-record OID is unresolvable: ${governedBlob.detail}`
    };
  }
  const revs = item5Git(root, ["rev-list", headCommit]);
  if (!revs.ok) return { ok: false, findings: [], detail: revs.detail };
  const commits = revs.stdout.toString("utf8").trim().split(/\r?\n/u).filter(Boolean);
  if (commits.length === 0 || commits.length > ITEM5_HISTORY_COMMIT_LIMIT) {
    return { ok: false, findings: [], detail: `history contains ${commits.length} commits, outside the bounded limit` };
  }
  const seenBlobs = new Set();
  const candidateLocations = [];
  const findings = [];
  let governedRecordExemptions = 0;
  let examinedBytes = 0;
  for (const commit of commits) {
    const tree = item5Git(root, ["ls-tree", "-r", "-z", commit]);
    if (!tree.ok) return { ok: false, findings, detail: `cannot enumerate ${commit}: ${tree.detail}` };
    for (const rawEntry of tree.stdout.toString("utf8").split("\0")) {
      if (rawEntry.length === 0) continue;
      const tab = rawEntry.indexOf("\t");
      if (tab === -1) return { ok: false, findings, detail: `malformed ls-tree entry at ${commit}` };
      const meta = rawEntry.slice(0, tab).split(" ");
      const relPath = rawEntry.slice(tab + 1);
      const oid = meta[2];
      if (meta[1] !== "blob" || !MACHINE_READABLE_EXTENSIONS.has(path.extname(relPath).toLowerCase())) continue;
      if (relPath === FREEZE_MANIFEST_PATH && oid === governedFreezeRecord.oid) {
        governedRecordExemptions += 1;
        continue;
      }
      if (seenBlobs.has(oid)) continue;
      seenBlobs.add(oid);
      if (seenBlobs.size > ITEM5_HISTORY_BLOB_LIMIT) {
        return { ok: false, findings, detail: `history exceeds the ${ITEM5_HISTORY_BLOB_LIMIT}-blob verification limit` };
      }
      candidateLocations.push({ oid, relPath, commit });
    }
  }
  const blobs = item5GitBatch(root, candidateLocations.map((candidate) => candidate.oid));
  for (const [index, candidate] of candidateLocations.entries()) {
      const blob = blobs[index];
      if (!blob.ok) return { ok: false, findings, detail: `${candidate.relPath} at ${candidate.commit}: ${blob.detail}` };
      examinedBytes += blob.bytes.length;
      if (examinedBytes > ITEM5_HISTORY_BYTE_LIMIT) {
        return { ok: false, findings, detail: `history exceeds the ${ITEM5_HISTORY_BYTE_LIMIT}-byte verification limit` };
      }
      const detected = machineReadableRuntimeFalse(blob.bytes);
      if (!detected.bounded) return { ok: false, findings, detail: `${candidate.relPath} exceeded the structured-value scan limit` };
      if (detected.found) findings.push(`${candidate.commit}:${candidate.relPath}`);
  }
  return {
    ok: true,
    findings,
    detail: findings.length === 0
      ? `scanned ${commits.length} reachable commit(s) and ${seenBlobs.size} unique machine-readable blob(s); exempted the exact immutable governed freeze-record object ${governedFreezeRecord.oid} at ${FREEZE_MANIFEST_PATH} in ${governedRecordExemptions} reachable commit(s)`
      : `prior runtimeMutable === false record(s): ${findings.join(" | ")}`
  };
}

/** Owner §2.5 F4: literal false plus a Git-object-proven first-false transition. */
export function freezeRuntimeMutabilityConditions(man, prefix, gi, root, frozenCommit) {
  const family = `${prefix}.runtimeMutability`;
  const head = item5Head(root);
  const frozen = item5ResolvedCommit(root, frozenCommit);
  const environment = item5HistoryEnvironment(root);
  const ancestry = head.ok && frozen.ok ? item5Ancestor(root, frozen.commit, head.commit) : { ok: false, detail: "commit ancestry unavailable" };
  const worktree = topLevelRead(root, FREEZE_MANIFEST_PATH, { kind: "F4_FREEZE_MANIFEST", maxBytes: TOP_LEVEL_BYTE_BUDGET });
  let worktreeValue = null;
  let worktreeParseError = null;
  if (worktree.ok) {
    try { worktreeValue = JSON.parse(worktree.bytes.toString("utf8")); }
    catch (error) { worktreeParseError = error.message; }
  }
  const committed = head.ok ? item5GitBlob(root, head.commit, FREEZE_MANIFEST_PATH) : { ok: false, bytes: null, detail: "HEAD unavailable" };
  const committedObject = committed.ok
    ? { ok: true, oid: committed.oid, detail: committed.detail }
    : { ok: false, oid: null, detail: committed.detail };
  let committedValue = null;
  let committedParseError = null;
  if (committed.ok) {
    try { committedValue = JSON.parse(committed.bytes.toString("utf8")); }
    catch (error) { committedParseError = error.message; }
  }
  const runtimeMutableOccurrences = committed.ok
    ? jsonPropertyOccurrenceCount(committed.bytes, "runtimeMutable")
    : { ok: false, count: 0, detail: "committed freeze-record bytes unavailable" };
  const frozenCommitOccurrences = committed.ok
    ? jsonPropertyOccurrenceCount(committed.bytes, "frozenCommit")
    : { ok: false, count: 0, detail: "committed freeze-record bytes unavailable" };
  const committedCriticalFieldsUnique = runtimeMutableOccurrences.ok && frozenCommitOccurrences.ok &&
    runtimeMutableOccurrences.count === 1 && frozenCommitOccurrences.count === 1;
  const bytesBound = worktree.ok && committed.ok && CANON.normalizeToLf(worktree.bytes).equals(CANON.normalizeToLf(committed.bytes));
  const argumentBound = worktreeValue !== null && deepEqual(man, worktreeValue);
  const recordFrozen = typeof committedValue?.frozenCommit === "string" ? committedValue.frozenCommit.toLowerCase() : null;
  const recordBound = frozen.ok && recordFrozen === frozen.commit;
  const prerequisites = head.ok && frozen.ok && environment.ok && ancestry.ok && committed.ok && committedObject.ok && committedValue !== null &&
    committedCriticalFieldsUnique &&
    committedValue.runtimeMutable === false && recordBound && bytesBound && argumentBound && man?.runtimeMutable === false;
  const history = prerequisites
    ? scanReachableHistoryForPriorRuntimeFalse(root, head.commit, {
        oid: committedObject.oid,
        bytes: committed.bytes
      })
    : { ok: false, findings: [], detail: "history scan withheld because the committed freeze record or history anchor is invalid" };

  return [
    condition(`${family}.literalFalse`, CONDITION_CLASS.CONTENT, man?.runtimeMutable === false,
      `runtimeMutable = ${JSON.stringify(man?.runtimeMutable ?? null)} (literal false required)`),
    condition(`${family}.historyEnvironmentTrusted`, CONDITION_CLASS.PRECONDITION, environment.ok, environment.detail),
    condition(`${family}.headAndFrozenCommitResolved`, CONDITION_CLASS.CONTENT, head.ok && frozen.ok,
      `${head.detail}; ${frozen.detail}`),
    condition(`${family}.frozenCommitAncestorOfHead`, CONDITION_CLASS.CONTENT, ancestry.ok, ancestry.detail),
    condition(`${family}.worktreeManifestSnapshotParsed`, CONDITION_CLASS.CONTENT, worktree.ok && worktreeValue !== null,
      !worktree.ok ? worktree.reason : worktreeValue !== null ? "working-tree freeze manifest parsed from one bounded snapshot" : `unparseable freeze manifest: ${worktreeParseError}`),
    condition(`${family}.committedHeadRecordParsed`, CONDITION_CLASS.CONTENT, committed.ok && committedValue !== null,
      !committed.ok ? committed.detail : committedValue !== null ? "freeze record parsed from the committed HEAD blob" : `committed freeze record unparseable: ${committedParseError}`),
    condition(`${family}.committedHeadRecordObjectIdentified`, CONDITION_CLASS.CONTENT, committedObject.ok,
      committedObject.detail),
    condition(`${family}.committedCriticalFieldsUnique`, CONDITION_CLASS.CONTENT, committedCriticalFieldsUnique,
      `${runtimeMutableOccurrences.detail}; ${frozenCommitOccurrences.detail}; exactly one occurrence of each critical property is required`),
    condition(`${family}.workingTreeBoundToCommittedRecord`, CONDITION_CLASS.CONTENT, bytesBound && argumentBound,
      bytesBound && argumentBound ? "working-tree bytes, parsed argument, and committed HEAD freeze record agree" : "working-tree freeze assertion is not byte/structure-bound to the committed HEAD record"),
    condition(`${family}.committedRecordBindsFrozenCommit`, CONDITION_CLASS.CONTENT, recordBound,
      `committed freeze record frozenCommit = ${JSON.stringify(committedValue?.frozenCommit ?? null)}; required ${JSON.stringify(frozen.commit)}`),
    condition(`${family}.committedRecordLiteralFalse`, CONDITION_CLASS.CONTENT, committedValue?.runtimeMutable === false,
      `committed freeze record runtimeMutable = ${JSON.stringify(committedValue?.runtimeMutable ?? null)} (literal false required)`),
    condition(`${family}.reachableHistoryFullyScanned`, CONDITION_CLASS.CONTENT, history.ok, history.detail),
    condition(`${family}.firstFalseProvenFromGitObjects`, CONDITION_CLASS.CONTENT, history.ok && history.findings.length === 0,
      history.ok && history.findings.length === 0
        ? `no earlier or peer tracked machine-readable runtimeMutable === false artifact is reachable from HEAD other than the exact immutable governed freeze-record object at ${FREEZE_MANIFEST_PATH}`
        : history.detail)
  ];
}

/** Owner §2.5 F6/A3: current exact-set drift proof over frozen and HEAD blobs. */
export function freezeDriftVerificationConditions(man, prefix, gi, root, frozenCommit) {
  const family = `${prefix}.postFreezeDriftVerification`;
  const ref = man?.postFreezeDriftVerification;
  const read = topLevelRead(root, ref?.artifactPath, { kind: "F6_A3_DRIFT_VERIFICATION", maxBytes: TOP_LEVEL_BYTE_BUDGET });
  let a3 = null;
  let parseError = null;
  if (read.ok) {
    try { a3 = JSON.parse(read.bytes.toString("utf8")); }
    catch (error) { parseError = error.message; }
  }
  const approvedPaths = gi?.criteria?.frozenGovernedRuntimeSet?.paths;
  const expectedCount = gi?.criteria?.frozenGovernedRuntimeSet?.expectedFileCount;
  const approvedValid = Array.isArray(approvedPaths) && approvedPaths.length === expectedCount &&
    new Set(approvedPaths).size === approvedPaths.length && approvedPaths.every((entry) => typeof entry === "string");
  const a3Paths = a3?.governedRuntimeSet;
  const a3Exact = approvedValid && Array.isArray(a3Paths) && a3Paths.length === approvedPaths.length &&
    new Set(a3Paths).size === a3Paths.length &&
    a3Paths.every((entry) => typeof entry === "string" && approvedPaths.includes(entry));
  const exactKeys = a3 !== null && !Array.isArray(a3) &&
    Object.keys(a3).sort().join("\0") === ["fromCommit", "governedRuntimeSet", "toCommit"].sort().join("\0");
  const declaredDigestOk = SHA256_RE.test(ref?.sha256 ?? "");
  const digestMatches = read.ok && declaredDigestOk && CANON.canonicalSha256(read.bytes) === ref.sha256;
  const localPrerequisites = read.ok && digestMatches && a3 !== null && exactKeys && approvedValid && a3Exact;
  const head = localPrerequisites
    ? item5Head(root)
    : { ok: false, commit: null, detail: "HEAD resolution withheld because retained A3 evidence or its exact governed set is invalid" };
  const frozen = localPrerequisites
    ? item5ResolvedCommit(root, frozenCommit)
    : { ok: false, commit: null, detail: "frozen-commit resolution withheld because retained A3 evidence or its exact governed set is invalid" };
  const ancestry = head.ok && frozen.ok
    ? item5Ancestor(root, frozen.commit, head.commit)
    : { ok: false, detail: "commit ancestry unavailable" };
  const anchorsMatch = frozen.ok && head.ok && a3?.fromCommit === frozen.commit && a3?.toCommit === head.commit;
  const proofPrerequisites = localPrerequisites && head.ok && frozen.ok && ancestry.ok && anchorsMatch;
  const proofWithheldDetail = "exact-set Git diff and blob proof withheld because retained A3 bytes, digest, exact schema/set, current anchors, resolved commits, or ancestry are invalid";
  const blobFailures = [];
  const exactSetDiff = proofPrerequisites
    ? item5Git(root, ["diff", "--quiet", "--no-ext-diff", frozen.commit, head.commit, "--", ...approvedPaths])
    : { ok: false, detail: proofWithheldDetail };
  if (proofPrerequisites) {
    const blobs = item5GitBatch(root, approvedPaths.flatMap((relPath) => [
      `${frozen.commit}:${CANON.toGitPath(relPath)}`,
      `${head.commit}:${CANON.toGitPath(relPath)}`
    ]));
    for (const [index, relPath] of approvedPaths.entries()) {
      const before = blobs[index * 2];
      const after = blobs[index * 2 + 1];
      if (!before.ok || !after.ok) {
        blobFailures.push(`${relPath}: ${!before.ok ? before.detail : after.detail}`);
      } else if (!before.bytes.equals(after.bytes) || CANON.rawSha256(before.bytes) !== CANON.rawSha256(after.bytes)) {
        blobFailures.push(`${relPath}: committed blob drift between ${frozen.commit} and ${head.commit}`);
      }
    }
  }

  return [
    condition(`${family}.declared`, CONDITION_CLASS.EVIDENCE_PRESENCE,
      ref !== null && typeof ref === "object" && !Array.isArray(ref),
      ref !== null && typeof ref === "object" ? "postFreezeDriftVerification declared" : "postFreezeDriftVerification missing"),
    condition(`${family}.artifactRead`, CONDITION_CLASS.EVIDENCE_PRESENCE, read.ok,
      read.ok ? "A3 read as one bounded contained regular-file snapshot" : read.reason),
    condition(`${family}.digestPinned`, CONDITION_CLASS.CONTENT, digestMatches,
      read.ok ? `declared ${JSON.stringify(ref?.sha256 ?? null)}; canonical ${CANON.canonicalSha256(read.bytes)}` : "A3 bytes unavailable for digest verification"),
    condition(`${family}.parsedExactSchema`, CONDITION_CLASS.CONTENT, a3 !== null && exactKeys,
      a3 === null ? `A3 unparseable: ${parseError ?? "no retained bytes"}` : `A3 top-level keys = ${JSON.stringify(Object.keys(a3))}`),
    condition(`${family}.headAndFrozenCommitResolved`, CONDITION_CLASS.CONTENT, head.ok && frozen.ok,
      `${head.detail}; ${frozen.detail}`),
    condition(`${family}.frozenCommitAncestorOfHead`, CONDITION_CLASS.CONTENT, ancestry.ok, ancestry.detail),
    condition(`${family}.anchorsCurrent`, CONDITION_CLASS.CONTENT, anchorsMatch,
      `A3 fromCommit/toCommit = ${JSON.stringify([a3?.fromCommit ?? null, a3?.toCommit ?? null])}; required ${JSON.stringify([frozen.commit, head.commit])}`),
    condition(`${family}.exactUniqueGovernedSet`, CONDITION_CLASS.CONTENT, a3Exact,
      a3Exact ? `A3 carries the exact unique approved ${approvedPaths.length}-path governed set` : "A3 governedRuntimeSet is missing, stale, duplicated, incomplete, substituted, or has extras"),
    condition(`${family}.gitDiffExactSetEmpty`, CONDITION_CLASS.CONTENT, exactSetDiff.ok,
      exactSetDiff.ok ? "git diff over the exact approved governed set from frozenCommit to HEAD is empty, including file modes" : exactSetDiff.detail),
    condition(`${family}.everyCommittedBlobUnchanged`, CONDITION_CLASS.CONTENT,
      proofPrerequisites && blobFailures.length === 0,
      !proofPrerequisites
        ? proofWithheldDetail
        : blobFailures.length === 0
          ? "every exact governed path has identical committed blob bytes at frozenCommit and HEAD"
          : blobFailures.join(" | "))
  ];
}

function exactCanonicalExpectationSet(value) {
  return Array.isArray(value) &&
    value.length === CANONICAL_EXPECTATION_SET.length &&
    new Set(value.map((entry) => entry?.path)).size === value.length &&
    value.every((entry, index) =>
      entry !== null && typeof entry === "object" && !Array.isArray(entry) &&
      Object.keys(entry).sort().join("\0") === "path\0sha256" &&
      entry.path === CANONICAL_EXPECTATION_SET[index].path &&
      entry.sha256 === CANONICAL_EXPECTATION_SET[index].sha256 &&
      SHA256_RE.test(entry.sha256));
}

/**
 * Owner §2.5 X1/X4 history evidence: list every commit reachable from HEAD
 * strictly after frozenCommit that changes any of the given paths. Full
 * history (no simplification) is mandatory: default pathspec simplification
 * can prune a side branch whose change was restored before a merge, which is
 * precisely the edit-after-freeze X1/X4 must still detect.
 */
function scanPostFreezePathHistory(root, frozenCommit, headCommit, relPaths) {
  const revs = item5Git(root, [
    "rev-list", "--full-history", `${frozenCommit}..${headCommit}`, "--", ...relPaths
  ]);
  if (!revs.ok) {
    return { ok: false, findings: [], detail: `post-freeze history scan failed: ${revs.detail}` };
  }
  const findings = revs.stdout.toString("utf8").split(/\r?\n/u).filter(Boolean);
  if (findings.length > ITEM5_HISTORY_COMMIT_LIMIT) {
    return {
      ok: false,
      findings: [],
      detail: `post-freeze history contains ${findings.length} commit(s) touching the scanned paths, outside the bounded limit`
    };
  }
  return {
    ok: true,
    findings,
    detail: findings.length === 0
      ? `full-history scan of every commit after ${frozenCommit} reachable from HEAD found no change to any of the ${relPaths.length} scanned path(s)`
      : `post-freeze commit(s) touching scanned path(s): ${findings.join(" | ")}`
  };
}

/** Owner §2.5 X1: no enumerated governed runtime path may change after the freeze. */
export function freezePostFreezeRuntimeHistoryConditions(man, prefix, gi, root, frozenCommit) {
  const family = `${prefix}.postFreezeRuntimeHistory`;
  const approvedPaths = gi?.criteria?.frozenGovernedRuntimeSet?.paths;
  const expectedCount = gi?.criteria?.frozenGovernedRuntimeSet?.expectedFileCount;
  const approvedValid = Array.isArray(approvedPaths) && approvedPaths.length === expectedCount &&
    new Set(approvedPaths).size === approvedPaths.length &&
    approvedPaths.every((entry) => typeof entry === "string" && entry.length > 0);
  const head = approvedValid
    ? item5Head(root)
    : { ok: false, commit: null, detail: "HEAD resolution withheld because the approved governed runtime set is invalid" };
  const frozen = approvedValid
    ? item5ResolvedCommit(root, frozenCommit)
    : { ok: false, commit: null, detail: "frozen-commit resolution withheld because the approved governed runtime set is invalid" };
  const ancestry = head.ok && frozen.ok
    ? item5Ancestor(root, frozen.commit, head.commit)
    : { ok: false, detail: "commit ancestry unavailable" };
  const environment = item5HistoryEnvironment(root);
  const scan = approvedValid && head.ok && frozen.ok && ancestry.ok
    ? scanPostFreezePathHistory(root, frozen.commit, head.commit, approvedPaths)
    : { ok: false, findings: [], detail: "post-freeze governed-runtime history scan withheld because the approved set, resolved commits, or ancestry is invalid" };
  return [
    condition(`${family}.approvedGovernedSetAvailable`, CONDITION_CLASS.PRECONDITION, approvedValid,
      approvedValid
        ? `the approved criteria declare the exact unique ${approvedPaths.length}-path governed runtime set`
        : "the approved governed runtime set required for the X1 history scan is missing, malformed, duplicated, or non-unique"),
    condition(`${family}.headAndFrozenCommitResolved`, CONDITION_CLASS.CONTENT, head.ok && frozen.ok,
      `${head.detail}; ${frozen.detail}`),
    condition(`${family}.frozenCommitAncestorOfHead`, CONDITION_CLASS.CONTENT, ancestry.ok, ancestry.detail),
    condition(`${family}.historyEnvironmentTrusted`, CONDITION_CLASS.PRECONDITION, environment.ok, environment.detail),
    condition(`${family}.postFreezeHistoryFullyScanned`, CONDITION_CLASS.CONTENT, scan.ok, scan.detail),
    condition(`${family}.noGovernedRuntimeChangeAfterFreeze`, CONDITION_CLASS.CONTENT, scan.ok && scan.findings.length === 0,
      scan.ok && scan.findings.length === 0
        ? "no commit after frozenCommit changes any enumerated governed runtime path; X1 history integrity holds while F6 remains the independent endpoint-drift check"
        : `X1 violated: ${scan.findings.join(" | ")}; no governed-unfreeze mechanism exists in committed repository governance, so no post-freeze governed-runtime edit is exempt`)
  ];
}

/** Owner §2.5 X4: no pinned V1/R1/R2/R3 expectation path may be edited after the freeze. */
export function freezeOracleExpectationHistoryConditions(man, prefix, gi, root, frozenCommit) {
  const family = `${prefix}.oracleExpectationHistory`;
  const expectationPaths = CANONICAL_EXPECTATION_SET.map((expected) => expected.path);
  const head = item5Head(root);
  const frozen = item5ResolvedCommit(root, frozenCommit);
  const ancestry = head.ok && frozen.ok
    ? item5Ancestor(root, frozen.commit, head.commit)
    : { ok: false, detail: "commit ancestry unavailable" };
  const environment = item5HistoryEnvironment(root);
  const scan = head.ok && frozen.ok && ancestry.ok
    ? scanPostFreezePathHistory(root, frozen.commit, head.commit, expectationPaths)
    : { ok: false, findings: [], detail: "post-freeze oracle-expectation history scan withheld because the resolved commits or ancestry is invalid" };
  return [
    condition(`${family}.headAndFrozenCommitResolved`, CONDITION_CLASS.CONTENT, head.ok && frozen.ok,
      `${head.detail}; ${frozen.detail}`),
    condition(`${family}.frozenCommitAncestorOfHead`, CONDITION_CLASS.CONTENT, ancestry.ok, ancestry.detail),
    condition(`${family}.historyEnvironmentTrusted`, CONDITION_CLASS.PRECONDITION, environment.ok, environment.detail),
    condition(`${family}.postFreezeHistoryFullyScanned`, CONDITION_CLASS.CONTENT, scan.ok, scan.detail),
    condition(`${family}.noOracleExpectationEditAfterFreeze`, CONDITION_CLASS.CONTENT, scan.ok && scan.findings.length === 0,
      scan.ok && scan.findings.length === 0
        ? "no commit after frozenCommit edits any pinned V1/R1/R2/R3 expectation path; X4 history integrity holds"
        : `X4 violated: ${scan.findings.join(" | ")}; restoring the pinned bytes in a later commit does not un-edit the post-freeze history`)
  ];
}

/** Owner §2.5 X4: the fixed V1/R1/R2/R3 expectation set is immutable. */
export function freezeOracleExpectationImmutabilityConditions(man, prefix, gi, root, frozenCommit) {
  const family = `${prefix}.oracleExpectationImmutability`;
  const criteriaSet = gi?.criteria?.criteria?.frozenRuntime?.canonicalExpectationSet;
  const manifestSet = man?.canonicalExpectationSet;
  const criteriaExact = exactCanonicalExpectationSet(criteriaSet);
  const manifestExact = exactCanonicalExpectationSet(manifestSet);
  const setsAgree = criteriaExact && manifestExact && deepEqual(criteriaSet, manifestSet);
  const localPrerequisites = criteriaExact && manifestExact && setsAgree;
  const head = localPrerequisites
    ? item5Head(root)
    : { ok: false, commit: null, detail: "HEAD resolution withheld because the two exact pinned expectation sets do not agree" };
  const frozen = localPrerequisites
    ? item5ResolvedCommit(root, frozenCommit)
    : { ok: false, commit: null, detail: "frozen-commit resolution withheld because the two exact pinned expectation sets do not agree" };
  const ancestry = head.ok && frozen.ok
    ? item5Ancestor(root, frozen.commit, head.commit)
    : { ok: false, detail: "commit ancestry unavailable" };
  const proofPrerequisites = localPrerequisites && head.ok && frozen.ok && ancestry.ok;
  const proofWithheldDetail = "oracle blob proof withheld because both exact pinned sets, their ordered equality, resolved commits, or ancestry are invalid";
  const failures = [];
  if (proofPrerequisites) {
    const blobs = item5GitBatch(root, CANONICAL_EXPECTATION_SET.flatMap((expected) => [
      `${frozen.commit}:${CANON.toGitPath(expected.path)}`,
      `${head.commit}:${CANON.toGitPath(expected.path)}`
    ]));
    for (const [index, expected] of CANONICAL_EXPECTATION_SET.entries()) {
      const before = blobs[index * 2];
      const after = blobs[index * 2 + 1];
      if (!before.ok || !after.ok) {
        failures.push(`${expected.path}: ${!before.ok ? before.detail : after.detail}`);
        continue;
      }
      const beforeSha = CANON.rawSha256(before.bytes);
      const afterSha = CANON.rawSha256(after.bytes);
      if (beforeSha !== expected.sha256 || afterSha !== expected.sha256 || !before.bytes.equals(after.bytes)) {
        failures.push(`${expected.path}: frozen ${beforeSha}, HEAD ${afterSha}, pinned ${expected.sha256}`);
      }
    }
  }
  return [
    condition(`${family}.criteriaExactPinnedSet`, CONDITION_CLASS.DEFINITION, criteriaExact,
      criteriaExact ? "criteria declare the exact ordered unique fixed V1/R1/R2/R3 path/digest set" : "criteria canonicalExpectationSet disagrees with the fixed owner-approved set"),
    condition(`${family}.manifestExactPinnedSet`, CONDITION_CLASS.CONTENT, manifestExact,
      manifestExact ? "freeze manifest declares the exact ordered unique fixed V1/R1/R2/R3 path/digest set" : "freeze manifest canonicalExpectationSet is missing, reordered, duplicated, substituted, incomplete, extra, or wrongly pinned"),
    condition(`${family}.criteriaManifestOrderedEquality`, CONDITION_CLASS.CONTENT, setsAgree,
      setsAgree ? "criteria and freeze manifest expectation sets are identical in order and value" : "criteria and freeze manifest expectation sets are not identical"),
    condition(`${family}.frozenCommitAncestorOfHead`, CONDITION_CLASS.CONTENT, ancestry.ok, ancestry.detail),
    condition(`${family}.frozenAndHeadBlobsEqualPins`, CONDITION_CLASS.CONTENT,
      proofPrerequisites && failures.length === 0,
      !proofPrerequisites
        ? proofWithheldDetail
        : failures.length === 0
          ? "all four committed oracle blobs at frozenCommit and HEAD equal their fixed pinned digests"
          : failures.join(" | "))
  ];
}

function checkFreezeManifestExact(item, root, gi, ctx = null) {
  const prefix = "freeze";
  const conditions = [
    ...governedInputConditions(gi),
    ...criterionDefinitionConditions(gi, item),
    ...contractSequencingConditions(item, gi),
    ...freezePreconditionP1Conditions(item, ctx, prefix)
  ];

  const freeze = gi.freeze;
  const man = freeze.value ?? null;
  const declaredPaths = Array.isArray(man?.governedRuntimeSet)
    ? man.governedRuntimeSet.map((e) => (typeof e === "string" ? e : e?.path)).filter((p) => typeof p === "string")
    : null;
  const approvedPaths = Array.isArray(gi.criteria?.frozenGovernedRuntimeSet?.paths)
    ? gi.criteria.frozenGovernedRuntimeSet.paths
    : null;
  const expectedCount = Number(gi.criteria?.frozenGovernedRuntimeSet?.expectedFileCount ?? NaN);
  const frozenCommit = frozenCommitOf(freeze);

  conditions.push(
    condition(
      `${prefix}.present`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      freeze.present === true,
      freeze.present ? `${FREEZE_MANIFEST_PATH} present` : `${FREEZE_MANIFEST_PATH} not found`
    ),
    condition(
      `${prefix}.parsed`,
      CONDITION_CLASS.CONTENT,
      freeze.present === true && man !== null,
      freeze.present === false
        ? "no freeze manifest to parse"
        : man !== null
          ? "freeze manifest parsed"
          : `freeze manifest unparseable: ${freeze.parseError}`
    ),
    condition(
      `${prefix}.declaredEnvelopeName`,
      CONDITION_CLASS.CONTENT,
      man?.envelope === FREEZE_ENVELOPE_NAME,
      `envelope = ${JSON.stringify(man?.envelope ?? null)} (${FREEZE_ENVELOPE_NAME} required)`
    ),
    condition(
      `${prefix}.immutableDeclared`,
      CONDITION_CLASS.CONTENT,
      man?.immutable === true,
      `immutable = ${JSON.stringify(man?.immutable ?? null)} (true required)`
    ),
    condition(
      `${prefix}.frozenCommitWellFormed`,
      CONDITION_CLASS.CONTENT,
      frozenCommit !== null,
      `frozenCommit = ${JSON.stringify(man?.frozenCommit ?? null)} (a full 40-character object name is required)`
    ),
    condition(
      `${prefix}.canonicalByteConventionDeclared`,
      CONDITION_CLASS.CONTENT,
      man?.canonicalByteConvention?.policy === CANON.CANONICAL_EOL_POLICY.policy &&
        man?.canonicalByteConvention?.loneCrPreserved === true,
      `canonicalByteConvention = ${JSON.stringify(man?.canonicalByteConvention ?? null)} (policy ${
        CANON.CANONICAL_EOL_POLICY.policy
      } with loneCrPreserved true required, matching the sealed convention)`
    ),
    condition(
      `${prefix}.governedRuntimeSetDeclared`,
      CONDITION_CLASS.CONTENT,
      declaredPaths !== null,
      declaredPaths === null ? "freeze manifest declares no governedRuntimeSet array" : `governedRuntimeSet declares ${declaredPaths.length} path(s)`
    ),
    condition(
      `${prefix}.approvedRuntimeSetAvailable`,
      CONDITION_CLASS.PRECONDITION,
      approvedPaths !== null && approvedPaths.length === expectedCount,
      approvedPaths === null
        ? "approved criteria declare no frozenGovernedRuntimeSet.paths to compare against"
        : `approved criteria declare ${approvedPaths.length} governed runtime paths (expectedFileCount ${expectedCount})`
    )
  );

  conditions.push(
    ...freezeServicesTreeDigestConditions(man, prefix, gi, root, frozenCommit),
    ...freezeRuntimeMutabilityConditions(man, prefix, gi, root, frozenCommit),
    ...freezeDriftVerificationConditions(man, prefix, gi, root, frozenCommit),
    ...freezeOracleExpectationImmutabilityConditions(man, prefix, gi, root, frozenCommit),
    ...freezePostFreezeRuntimeHistoryConditions(man, prefix, gi, root, frozenCommit),
    ...freezeOracleExpectationHistoryConditions(man, prefix, gi, root, frozenCommit)
  );

  // Exact set equality against the approved 26-path set: no extras, no omissions.
  if (declaredPaths !== null && approvedPaths !== null) {
    const declaredSet = new Set(declaredPaths);
    const approvedSet = new Set(approvedPaths);
    const extras = declaredPaths.filter((p) => !approvedSet.has(p));
    const omissions = approvedPaths.filter((p) => !declaredSet.has(p));
    conditions.push(
      condition(
        `${prefix}.governedRuntimeSetExactSetEquality`,
        CONDITION_CLASS.CONTENT,
        extras.length === 0 && omissions.length === 0 && declaredSet.size === declaredPaths.length,
        extras.length === 0 && omissions.length === 0 && declaredSet.size === declaredPaths.length
          ? `governed runtime set equals the approved ${approvedPaths.length}-path set exactly`
          : `extras: [${extras.join(", ")}]; omissions: [${omissions.join(", ")}]; duplicates: ${
              declaredPaths.length - declaredSet.size
            } (freezing only the three analyzer service files does not satisfy D5)`
      )
    );
  }

  // Independent digest recomputation and drift check, one entry at a time. Every
  // failure is collected: a freeze that is wrong in ten places must not report
  // one.
  if (man !== null && frozenCommit !== null && Array.isArray(man.governedRuntimeSet)) {
    const digestFailures = [];
    const driftFailures = [];
    const unresolvable = [];
    for (const entry of man.governedRuntimeSet) {
      const relPath = typeof entry === "string" ? entry : entry?.path;
      if (typeof relPath !== "string") continue;
      const declaredDigest = typeof entry === "object" && entry !== null ? entry.committedBlobSha256 : null;
      let committed = null;
      try {
        committed = CANON.committedBlobSha256(root, relPath, frozenCommit);
      } catch (err) {
        unresolvable.push(`${relPath}: ${err.message}`);
        continue;
      }
      if (declaredDigest !== committed) {
        digestFailures.push(`${relPath}: declared ${JSON.stringify(declaredDigest)} vs committed ${committed}`);
      }
      const worktree = readTextUnderRoot(root, relPath);
      if (!worktree.present) {
        driftFailures.push(`${relPath}: not present in the working tree`);
      } else if (CANON.canonicalSha256(worktree.bytes) !== committed) {
        driftFailures.push(
          `${relPath}: canonical worktree bytes ${CANON.canonicalSha256(worktree.bytes)} differ from committed ${committed}`
        );
      }
    }
    conditions.push(
      condition(
        `${prefix}.frozenCommitResolvable`,
        CONDITION_CLASS.CONTENT,
        unresolvable.length === 0,
        unresolvable.length === 0
          ? `frozenCommit ${frozenCommit} resolves for every declared path`
          : `unresolvable at frozenCommit: ${unresolvable.join(" | ")}`
      ),
      condition(
        `${prefix}.everyDigestIndependentlyRecomputed`,
        CONDITION_CLASS.CONTENT,
        digestFailures.length === 0,
        digestFailures.length === 0
          ? "every declared committedBlobSha256 equals this gate's independent hash of the committed blob at frozenCommit"
          : `${digestFailures.length} digest mismatch(es): ${digestFailures.join(" | ")}`
      ),
      condition(
        `${prefix}.noWorktreeDrift`,
        CONDITION_CLASS.CONTENT,
        driftFailures.length === 0,
        driftFailures.length === 0
          ? "canonical worktree bytes equal the committed bytes for every governed runtime file"
          : `${driftFailures.length} drift finding(s): ${driftFailures.join(" | ")}`
      )
    );
  }

  const stagingIdentity = man?.stagingIdentity ?? null;
  conditions.push(
    condition(
      `${prefix}.stagingIdentity.environmentIsStaging`,
      CONDITION_CLASS.CONTENT,
      stagingIdentity?.environment === "staging",
      `stagingIdentity.environment = ${JSON.stringify(stagingIdentity?.environment ?? null)} (staging required)`
    ),
    condition(
      `${prefix}.stagingIdentity.attributedToFrozenCommit`,
      CONDITION_CLASS.CONTENT,
      frozenCommit !== null && stagingIdentity?.attributedCommit === frozenCommit,
      `stagingIdentity.attributedCommit = ${JSON.stringify(stagingIdentity?.attributedCommit ?? null)} (frozenCommit ${JSON.stringify(
        frozenCommit
      )} required)`
    ),
    condition(
      `${prefix}.stagingIdentity.methodAndEvidenceNamed`,
      CONDITION_CLASS.CONTENT,
      typeof stagingIdentity?.attributionMethod === "string" &&
        stagingIdentity.attributionMethod.length > 0 &&
        typeof stagingIdentity?.attributionEvidence === "string" &&
        stagingIdentity.attributionEvidence.length > 0,
      `attributionMethod = ${JSON.stringify(stagingIdentity?.attributionMethod ?? null)}, attributionEvidence = ${JSON.stringify(
        stagingIdentity?.attributionEvidence ?? null
      )} (both required; an asserted match with no named method or evidence is unmet)`
    ),
    condition(
      `${prefix}.stagingIdentity.verified`,
      CONDITION_CLASS.CONTENT,
      stagingIdentity?.verified === true,
      `stagingIdentity.verified = ${JSON.stringify(stagingIdentity?.verified ?? null)} (true required)`
    ),
    condition(
      `${prefix}.productionOutOfScope`,
      CONDITION_CLASS.CONTENT,
      man?.productionInScope === false,
      `productionInScope = ${JSON.stringify(man?.productionInScope ?? null)} (false required; production is never contacted or accepted, D6)`
    ),
    ...freezePreconditionP2P3Conditions(man, declaredPaths, prefix)
  );

  return statusFromConditions(conditions, item.id);
}

// ── New check: POST_FREEZE_CAMPAIGN_LEDGER (roadmap item 6) ─────────────────
//
// D7 fixes the definition, D8 makes at least one genuinely unseen/holdout/blind
// campaign mandatory and excludes R4, and D14 forbids any expectation revision
// between the freeze and the evidence. Ordering is pinned to the freeze digest
// rather than asserted, and every campaign's own result manifest is rehashed
// through A15 V1's verifier so the two gates agree on what verification means.

function checkPostFreezeCampaignLedger(item, root, gi, ctx = null) {
  const prefix = "postFreeze";
  const conditions = [
    ...governedInputConditions(gi),
    ...criterionDefinitionConditions(gi, item),
    ...contractSequencingConditions(item, gi),
    // Item 6 declares dependsOnItems: ["frozenRuntime"]. Declaring a dependency
    // and never evaluating it is worse than not declaring it, because the
    // contract then reads as though the ordering were enforced. Item 6 must not
    // be reachable while the freeze it reports on is not.
    ...freezePreconditionP1Conditions(item, ctx, prefix, "dependency"),
    ...holdoutAdmissionConditions(null, prefix)
  ];

  const found = readJsonUnderRoot(root, item.evidenceSource);
  const ledger = found.value ?? null;
  const campaigns = Array.isArray(ledger?.campaigns) ? ledger.campaigns : null;
  const declaredFreezeRef = typeof ledger?.freezeRef?.sha256 === "string" ? ledger.freezeRef.sha256 : null;

  conditions.push(
    condition(
      `${prefix}.present`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      found.present === true,
      found.present ? `${POST_FREEZE_LEDGER_PATH} present` : `${POST_FREEZE_LEDGER_PATH} not found`
    ),
    condition(
      `${prefix}.parsed`,
      CONDITION_CLASS.CONTENT,
      found.present === true && ledger !== null,
      found.present === false
        ? "no campaign ledger to parse"
        : ledger !== null
          ? "campaign ledger parsed"
          : `campaign ledger unparseable: ${found.parseError}`
    ),
    condition(
      `${prefix}.declaredEnvelopeName`,
      CONDITION_CLASS.CONTENT,
      ledger?.envelope === POST_FREEZE_ENVELOPE_NAME,
      `envelope = ${JSON.stringify(ledger?.envelope ?? null)} (${POST_FREEZE_ENVELOPE_NAME} required)`
    ),
    condition(
      `${prefix}.freezeManifestPresent`,
      CONDITION_CLASS.PRECONDITION,
      gi.freeze.present === true,
      gi.freeze.present ? `${FREEZE_MANIFEST_PATH} present as the ordering anchor` : `${FREEZE_MANIFEST_PATH} not present`
    ),
    condition(
      `${prefix}.freezeRefVerifiesAgainstFreezeBytes`,
      CONDITION_CLASS.CONTENT,
      digestPinsFreeze(gi.freeze, declaredFreezeRef),
      freezeDigestDetail(gi.freeze, declaredFreezeRef)
    ),
    condition(
      `${prefix}.atLeastOneCampaignRecorded`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      campaigns !== null && campaigns.length > 0,
      campaigns === null
        ? "campaign ledger declares no campaigns array"
        : `${campaigns.length} campaign(s) recorded (at least one required)`
    )
  );

  if (campaigns !== null && campaigns.length > 0) {
    const frozenCommit = frozenCommitOf(gi.freeze);
    const orderingFailures = [];
    const revisionFailures = [];
    const mislabelled = [];
    const manifestMissing = [];
    const manifestFailures = [];
    const stagingFailures = [];
    const qualifying = [];

    campaigns.forEach((campaign, index) => {
      const label = typeof campaign?.id === "string" ? campaign.id : `campaign[${index}]`;

      if (campaign?.producedAfterFreeze !== true || !digestPinsFreeze(gi.freeze, campaign?.freezeDigestAtProduction)) {
        orderingFailures.push(
          `${label}: producedAfterFreeze=${JSON.stringify(campaign?.producedAfterFreeze ?? null)}, ${freezeDigestDetail(
            gi.freeze,
            typeof campaign?.freezeDigestAtProduction === "string" ? campaign.freezeDigestAtProduction : null
          )}`
        );
      }
      if (campaign?.expectationRevisionsSinceFreeze !== 0) {
        revisionFailures.push(
          `${label}: expectationRevisionsSinceFreeze=${JSON.stringify(campaign?.expectationRevisionsSinceFreeze ?? null)}`
        );
      }

      const kind = typeof campaign?.kind === "string" ? campaign.kind : null;
      const labelledHoldout = kind !== null && HOLDOUT_KINDS.includes(kind);
      if (labelledHoldout && campaign?.analyzerInformed === true) {
        mislabelled.push(`${label}: labelled ${kind} while analyzerInformed=true`);
      }

      const lineage = Array.isArray(campaign?.oracleLineage) ? campaign.oracleLineage : null;
      const admission = holdoutAdmissionConditions(campaign, `${prefix}.campaign.${label}`);
      const admitted = admission.every((entry) => entry.satisfied === true);
      if (
        labelledHoldout &&
        campaign?.analyzerInformed === false &&
        campaign?.evidenceClass === "INDEPENDENT_CLOSURE" &&
        lineage !== null &&
        !lineage.some(namesR4) &&
        admitted
      ) {
        qualifying.push(label);
      }

      // Every campaign's own result manifest is rehashed entry by entry using
      // A15 V1's verifier, so a manifest of placeholder hashes over deleted
      // artifacts cannot pass here either.
      const manifestRel = typeof campaign?.resultManifest === "string" ? campaign.resultManifest : null;
      if (manifestRel === null || !readTextUnderRoot(root, manifestRel).present) {
        manifestMissing.push(`${label}: resultManifest ${JSON.stringify(manifestRel)} not present`);
      } else {
        let verification = null;
        try {
          verification = V1.verifyEvidenceManifest(root, manifestRel);
        } catch (err) {
          manifestFailures.push(`${label}: manifest verification threw: ${err.message}`);
        }
        if (verification !== null && verification.ok !== true) {
          manifestFailures.push(`${label}: ${verification.errors.join("; ")}`);
        }
      }

      const staging = campaign?.stagingDeployment ?? null;
      if (staging !== null && staging !== undefined) {
        if (frozenCommit === null || staging.attributedCommit !== frozenCommit) {
          stagingFailures.push(
            `${label}: stagingDeployment.attributedCommit=${JSON.stringify(
              staging.attributedCommit ?? null
            )} (frozenCommit ${JSON.stringify(frozenCommit)} required)`
          );
        }
      }
    });

    conditions.push(
      condition(
        `${prefix}.everyCampaignPinnedAfterFreeze`,
        CONDITION_CLASS.CONTENT,
        orderingFailures.length === 0,
        orderingFailures.length === 0
          ? "every campaign declares production after the freeze and pins the verified freeze digest"
          : `${orderingFailures.length} ordering finding(s): ${orderingFailures.join(" | ")}`
      ),
      condition(
        `${prefix}.everyCampaignHasNoExpectationRevisions`,
        CONDITION_CLASS.CONTENT,
        revisionFailures.length === 0,
        revisionFailures.length === 0
          ? "no campaign records an expectation revision since the freeze"
          : `${revisionFailures.length} revision finding(s): ${revisionFailures.join(" | ")}`
      ),
      condition(
        `${prefix}.noCampaignMislabelledAsHoldout`,
        CONDITION_CLASS.CONTENT,
        mislabelled.length === 0,
        mislabelled.length === 0
          ? "no analyzer-informed campaign carries an unseen/holdout/blind label"
          : `${mislabelled.length} mislabelling finding(s), a FAIL rather than a missing-evidence block (D8): ${mislabelled.join(
              " | "
            )}`
      ),
      condition(
        `${prefix}.atLeastOneQualifyingHoldoutCampaign`,
        CONDITION_CLASS.EVIDENCE_PRESENCE,
        qualifying.length > 0,
        qualifying.length > 0
          ? `qualifying unseen/holdout/blind campaign(s): ${qualifying.join(", ")}`
          : "no campaign is simultaneously UNSEEN/HOLDOUT/BLIND, INDEPENDENT_CLOSURE, not analyzer-informed and free of R4 oracle lineage (D8 makes at least one mandatory, and R4 cannot supply it)"
      ),
      condition(
        `${prefix}.everyCampaignResultManifestPresent`,
        CONDITION_CLASS.EVIDENCE_PRESENCE,
        manifestMissing.length === 0,
        manifestMissing.length === 0
          ? "every campaign names a present result manifest"
          : `${manifestMissing.length} missing manifest(s): ${manifestMissing.join(" | ")}`
      ),
      condition(
        `${prefix}.everyCampaignResultManifestRehashes`,
        CONDITION_CLASS.CONTENT,
        manifestFailures.length === 0,
        manifestFailures.length === 0
          ? "every present campaign result manifest verified by independent rehash of every entry"
          : `${manifestFailures.length} manifest verification finding(s): ${manifestFailures.join(" | ")}`
      ),
      condition(
        `${prefix}.everyStagingCampaignAttributedToFrozenCommit`,
        CONDITION_CLASS.CONTENT,
        stagingFailures.length === 0,
        stagingFailures.length === 0
          ? "every staging-based campaign is attributed to the frozen commit"
          : `${stagingFailures.length} staging attribution finding(s): ${stagingFailures.join(" | ")}`
      )
    );
  }

  return statusFromConditions(conditions, item.id);
}

// ── New check: LEDGER_ROW_SPLIT_GATE (roadmap items 7 and 8) ────────────────
//
// D9 splits the historical combined "Deterministic clean/staging closure" row
// into two independent forward-looking rows; D10 makes the split ADDITIVE. The
// historical row is never rewritten and is read here for diagnostic context
// only: a combined row cannot independently evidence two split criteria, so the
// fallback has no PASS path by construction.
//
// These two items do NOT carry the owner-fidelity precondition. Their operative
// definitions come from D9/D10 as recorded binding effects, not from the
// uncommitted proposal text that items 1-6 depend on.

function checkLedgerRowSplitGate(item, root, gi) {
  const prefix = "split";
  const conditions = [
    ...governedInputConditions(gi),
    ...criterionDefinitionConditions(gi, item, { requireOwnerFidelity: false })
  ];

  const key = item.criterionId ?? item.id;
  const entry = gi.criteria?.criteria?.[key] ?? null;

  conditions.push(
    condition(
      `${prefix}.ledgerRowLabelAgreesWithCriteria`,
      CONDITION_CLASS.DEFINITION,
      entry !== null && entry.ledgerRowLabel === item.ledgerRowLabel,
      `contract ledgerRowLabel ${JSON.stringify(item.ledgerRowLabel)} vs criteria ${JSON.stringify(
        entry?.ledgerRowLabel ?? null
      )}`
    ),
    condition(
      `${prefix}.expectedValueAgreesWithCriteria`,
      CONDITION_CLASS.DEFINITION,
      entry !== null && entry.expectedValue === item.expectedValue,
      `contract expectedValue ${JSON.stringify(item.expectedValue)} vs criteria ${JSON.stringify(
        entry?.expectedValue ?? null
      )}`
    ),
    condition(
      `${prefix}.historicalRowLabelAgreesWithCriteria`,
      CONDITION_CLASS.DEFINITION,
      entry !== null && entry.historicalCombinedRowLabel === item.historicalCombinedRowLabel,
      `contract historicalCombinedRowLabel ${JSON.stringify(item.historicalCombinedRowLabel)} vs criteria ${JSON.stringify(
        entry?.historicalCombinedRowLabel ?? null
      )}`
    ),
    condition(
      `${prefix}.additiveSplitDeclaredWithNoFallbackPass`,
      CONDITION_CLASS.DEFINITION,
      entry?.split?.mode === "ADDITIVE" &&
        entry?.split?.historicalRowsRewritten === false &&
        entry?.split?.fallbackCanProducePass === false,
      `criteria split declaration = ${JSON.stringify(entry?.split ?? null)} (ADDITIVE, historicalRowsRewritten false, fallbackCanProducePass false required by D10)`
    )
  );

  const ledger = readTextUnderRoot(root, item.evidenceSource);
  conditions.push(
    condition(
      `${prefix}.ledgerPresent`,
      CONDITION_CLASS.EVIDENCE_PRESENCE,
      ledger.present === true,
      ledger.present ? `${item.evidenceSource} present` : `${item.evidenceSource} not found`
    )
  );

  let selection = null;
  let historical = null;
  if (ledger.present) {
    selection = V1.selectLedgerRow(ledger.text, item.ledgerRowLabel);
    historical = V1.selectLedgerRow(ledger.text, item.historicalCombinedRowLabel);

    conditions.push(
      condition(
        `${prefix}.splitRowPresent`,
        CONDITION_CLASS.EVIDENCE_PRESENCE,
        selection.status === "FOUND",
        selection.status === "FOUND"
          ? selection.detail
          : `${selection.detail}; the historical combined row ${JSON.stringify(
              item.historicalCombinedRowLabel
            )} is ${historical.status === "FOUND" ? `recorded as ${historical.token}` : historical.status} and is DIAGNOSTIC ONLY: a combined row can never produce PASS for a split criterion (D10)`,
        {
          selectionRule: selection.selectionRule,
          occurrences: selection.occurrences,
          historicalCombinedRow: {
            label: item.historicalCombinedRowLabel,
            status: historical.status,
            token: historical.token,
            role: "DIAGNOSTIC_ONLY",
            canProducePass: false
          }
        }
      ),
      condition(
        `${prefix}.splitRowEqualsExpectedValue`,
        CONDITION_CLASS.CONTENT,
        selection.status === "FOUND" && selection.token === item.expectedValue,
        selection.status === "FOUND"
          ? `${item.ledgerRowLabel} = ${selection.token} (expected ${item.expectedValue})`
          : `no well-formed controlling row to compare against ${item.expectedValue}`
      )
    );
  }

  const result = statusFromConditions(conditions, item.id);
  return {
    ...result,
    ledgerSelection: selection,
    historicalCombinedRowSelection: historical
  };
}

// ── Catalogue dispatch ──────────────────────────────────────────────────────
//
// Inherited methods are delegated to A15 V1's own evaluateCheck rather than
// reimplemented, so items 9, 10 and 11 cannot drift between the two gates.

const INHERITED_CHECK_METHODS = Object.freeze(["LEDGER_ROW_EQUALS", "READ_MANIFEST_AND_VERDICT", "NOT_APPLICABLE"]);
const DEPENDENCY_EDGE_BUDGET = 20000;

/**
 * Validate the whole dependency graph iteratively before any item is evaluated.
 * Unknown targets, self-dependencies, any-length cycles and an incomplete
 * over-budget scan are contract PRECONDITION failures requiring SAFE_PAUSE.
 */
export function validateDependencyGraph(items) {
  const issues = [];
  if (!Array.isArray(items)) {
    return {
      status: ITEM_STATUS.BLOCKED_PRECONDITION,
      safePauseRequired: true,
      budgetExhausted: false,
      complete: false,
      edgeCount: 0,
      issues: [{ code: "INVALID_CATALOGUE", detail: "item catalogue is not an array" }]
    };
  }

  const byId = new Map();
  for (const [index, item] of items.entries()) {
    const id = item?.id;
    if (typeof id !== "string" || id.length === 0) {
      issues.push({ code: "INVALID_ITEM_ID", itemIndex: index, detail: "item id must be a non-empty string" });
      continue;
    }
    if (byId.has(id)) {
      issues.push({ code: "DUPLICATE_ITEM_ID", itemId: id, detail: `duplicate item id '${id}'` });
      continue;
    }
    byId.set(id, item);
  }

  const adjacency = new Map([...byId.keys()].map((id) => [id, []]));
  const indegree = new Map([...byId.keys()].map((id) => [id, 0]));
  let edgeCount = 0;
  let budgetExhausted = false;

  outer: for (const [id, item] of byId) {
    const dependencies = item.dependsOnItems === undefined ? [] : item.dependsOnItems;
    if (!Array.isArray(dependencies)) {
      issues.push({ code: "INVALID_DEPENDENCY_LIST", itemId: id, detail: "dependsOnItems must be an array" });
      continue;
    }
    for (const dependency of dependencies) {
      edgeCount += 1;
      if (edgeCount > DEPENDENCY_EDGE_BUDGET) {
        budgetExhausted = true;
        issues.push({
          code: "DEPENDENCY_BUDGET_EXHAUSTED",
          itemId: id,
          detail: `dependency graph exceeds the ${DEPENDENCY_EDGE_BUDGET}-edge validation budget`
        });
        break outer;
      }
      if (dependency === id) {
        issues.push({ code: "SELF_CYCLE", itemId: id, dependency, detail: `${id} depends on itself` });
      }
      if (typeof dependency !== "string" || !byId.has(dependency)) {
        issues.push({
          code: "UNKNOWN_DEPENDENCY",
          itemId: id,
          dependency,
          detail: `${id} depends on unknown item ${JSON.stringify(dependency)}`
        });
        continue;
      }
      adjacency.get(dependency).push(id);
      indegree.set(id, indegree.get(id) + 1);
    }
  }

  if (!budgetExhausted) {
    const queue = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id);
    let head = 0;
    let visited = 0;
    while (head < queue.length) {
      const id = queue[head];
      head += 1;
      visited += 1;
      for (const dependent of adjacency.get(id)) {
        const next = indegree.get(dependent) - 1;
        indegree.set(dependent, next);
        if (next === 0) queue.push(dependent);
      }
    }
    if (visited !== byId.size) {
      const cyclic = [...indegree].filter(([, degree]) => degree > 0).map(([id]) => id);
      issues.push({
        code: "DEPENDENCY_CYCLE",
        itemIds: cyclic,
        detail: `dependency cycle prevents a complete topological order (${cyclic.slice(0, 20).join(", ")}${cyclic.length > 20 ? ", ..." : ""})`
      });
    }
  }

  const safePauseRequired = issues.length > 0;
  return {
    status: safePauseRequired ? ITEM_STATUS.BLOCKED_PRECONDITION : ITEM_STATUS.PASS,
    safePauseRequired,
    budgetExhausted,
    complete: !budgetExhausted,
    edgeCount,
    issues
  };
}

/**
 * Cross-item status resolution for stage preconditions.
 *
 * Item 5 cannot be evaluated without item 4's status, and the catalogue is
 * walked in declaration order, so the dependency is resolved on demand and
 * memoized. Every item is therefore still evaluated exactly once, whether it is
 * reached by the walk or by a dependency lookup.
 *
 * The inProgress set is the MUTUAL_PRECONDITION_CYCLE detector. A re-entrant
 * lookup means two items are each other's precondition - the exact defect this
 * correction exists to fix - and it is reported as BLOCKED_PRECONDITION with
 * safePauseRequired rather than recursing until the stack gives out.
 */
export function createEvaluationContext(root, gi, items = SUCCESSOR_CONTRACT.exitItems) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("createEvaluationContext requires a non-empty item catalogue");
  }
  const graphValidation = validateDependencyGraph(items);
  const ids = items.map((it) => it?.id);
  const duplicated = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (duplicated.length > 0) {
    throw new Error(
      `item catalogue declares duplicate id(s) ${duplicated.join(
        ", "
      )}; a duplicate would shadow one item in the dependency index while the walk still evaluated both`
    );
  }
  if (ids.some((id) => typeof id !== "string" || id.length === 0)) {
    throw new Error("every item in the catalogue must declare a non-empty string id");
  }
  // Frozen for the same reason the contract itself is: a catalogue that can be
  // mutated at depth after the context is built is not a source of truth for the
  // verdict that context produces.
  const catalogue = deepFreeze([...items]);
  const byId = new Map(catalogue.map((it) => [it.id, it]));
  const cache = new Map();
  const inProgress = new Set();
  const cycles = [];

  const ctx = {
    root,
    gi,
    cycles,
    dependencyGraph: graphValidation,
    items: catalogue,
    /** The contract item behind an id, so a dependent item can read the shape of what it depends on. */
    itemOf(itemId) {
      return byId.get(itemId) ?? null;
    },
    statusOf(itemId) {
      const cached = cache.get(itemId);
      if (cached !== undefined) return cached;

      const item = byId.get(itemId);
      if (item === undefined) {
        return {
          status: ITEM_STATUS.BLOCKED_MISSING_DEFINITION,
          detail: `no exit item '${itemId}' in the live catalogue`,
          cycle: false,
          outcome: null
        };
      }


      if (graphValidation.status !== ITEM_STATUS.PASS) {
        const graphCondition = condition(
          "sequencing.dependencyGraphValid",
          CONDITION_CLASS.PRECONDITION,
          false,
          `dependency graph refused before item evaluation: ${graphValidation.issues.map((issue) => `${issue.code}: ${issue.detail}`).join(" | ")}`,
          { safePauseRequired: true, issues: graphValidation.issues }
        );
        const outcome = statusFromConditions([graphCondition], item.id);
        const entry = { status: outcome.status, detail: outcome.detail, cycle: true, outcome };
        cache.set(itemId, entry);
        return entry;
      }

      if (inProgress.has(itemId)) {
        const chain = [...inProgress, itemId];
        cycles.push(chain);
        // Deliberately NOT cached: the cycle is a property of this resolution
        // path, not a settled status for the item.
        return {
          status: ITEM_STATUS.BLOCKED_PRECONDITION,
          detail: `mutual precondition cycle: ${chain.join(" -> ")}`,
          cycle: true,
          outcome: null
        };
      }

      inProgress.add(itemId);
      let outcome;
      try {
        outcome = evaluateSuccessorItem(item, root, gi, ctx);
      } finally {
        inProgress.delete(itemId);
      }

      const entry = { status: outcome.status, detail: outcome.detail, cycle: false, outcome };
      cache.set(itemId, entry);
      return entry;
    },
    evaluateItem(item) {
      return ctx.statusOf(item.id).outcome ?? {
        status: ITEM_STATUS.BLOCKED_MISSING_DEFINITION,
        detail: `item '${item.id}' could not be evaluated`,
        conditions: [],
        safePause: []
      };
    }
  };

  return ctx;
}

export function evaluateSuccessorItem(item, root, gi, ctx = null) {
  switch (item.checkMethod) {
    case "CLOSURE_ENVELOPE_EXACT":
      return checkClosureEnvelopeExact(item, root, gi);
    case "MULTI_SUBCHECK":
      return checkStandaloneAndIntegratedExactGates(item, root, gi);
    case "FREEZE_MANIFEST_EXACT":
      return checkFreezeManifestExact(item, root, gi, ctx);
    case "POST_FREEZE_CAMPAIGN_LEDGER":
      return checkPostFreezeCampaignLedger(item, root, gi, ctx);
    case "LEDGER_ROW_SPLIT_GATE":
      return checkLedgerRowSplitGate(item, root, gi);
    case "LEDGER_ROW_EQUALS":
    case "READ_MANIFEST_AND_VERDICT":
    case "NOT_APPLICABLE": {
      const inherited = V1.evaluateCheck(item, root);
      if (!REQUIRED_ITEM_STATUSES.includes(inherited.status)) {
        throw new Error(
          `A15 V1 returned status '${inherited.status}' for inherited item '${item.id}', which is outside the agreed vocabulary`
        );
      }
      return {
        status: inherited.status,
        detail: inherited.detail,
        conditions: [],
        inheritedFromA15V1: true,
        safePause: []
      };
    }
    default:
      throw new Error(`unknown successor checkMethod: ${item.checkMethod}`);
  }
}

// ── PASS reachability, derived from the live catalogue ──────────────────────

const CHECK_METHODS_WITH_PASS_PATH = Object.freeze([
  "CLOSURE_ENVELOPE_EXACT",
  "FREEZE_MANIFEST_EXACT",
  "LEDGER_ROW_SPLIT_GATE",
  "LEDGER_ROW_EQUALS",
  "READ_MANIFEST_AND_VERDICT"
]);

function effectiveCheckMethods(item) {
  return item.checkMethod === "MULTI_SUBCHECK" ? item.subChecks.map((s) => s.checkMethod) : [item.checkMethod];
}

/**
 * Derive from the live catalogue whether this gate could ever produce an
 * end-to-end PASS. Same shape and same purpose as A15 V1's function of the same
 * name, so the same test can compare a declaration against code for both gates.
 */
export function computePassReachability() {
  const blocking = SUCCESSOR_CONTRACT.exitItems
    .filter((item) => item.checkMethod !== "NOT_APPLICABLE")
    .filter((item) => !effectiveCheckMethods(item).every((cm) => CHECK_METHODS_WITH_PASS_PATH.includes(cm)))
    .map((item) => item.id);
  return {
    aggregationLogicCanRepresentPass: true,
    currentCheckCatalogueCanProducePass: blocking.length === 0,
    itemsThatCannotCurrentlyProducePass: blocking,
    inheritedMethodsDelegatedToV1: INHERITED_CHECK_METHODS
  };
}

/**
 * The declared passReachability status must equal what the catalogue actually
 * supports. Called at import: a divergence is a refusal to load, never a wrong
 * claim inside an evidence artifact.
 */
export function assertPassReachabilityMatchesContract() {
  const derived = computePassReachability();
  const declared = SUCCESSOR_CONTRACT.passReachability.status;
  const expected = derived.currentCheckCatalogueCanProducePass ? "PASS_CAPABLE" : "NOT_PASS_CAPABLE";
  if (declared !== expected) {
    throw new Error(
      `contract declares passReachability ${declared} but the live catalogue is ${expected} ` +
        `(blocking: ${derived.itemsThatCannotCurrentlyProducePass.join(", ") || "none"})`
    );
  }
  return true;
}

// ── Evaluation ──────────────────────────────────────────────────────────────

export function evaluate(root) {
  const gi = loadGovernedInputs(root);
  const ctx = createEvaluationContext(root, gi);

  const evaluated = SUCCESSOR_CONTRACT.exitItems.map((item) => {
    const outcome = ctx.evaluateItem(item);
    const record = {
      id: item.id,
      roadmapItem: item.roadmapItem,
      roadmapWording: item.roadmapWording,
      checkMethod: item.checkMethod,
      stage: item.stage ?? null,
      status: outcome.status,
      detail: outcome.detail
    };
    if (Array.isArray(item.dependsOnItems)) record.dependsOnItems = item.dependsOnItems;
    if (Array.isArray(item.preconditionIds)) record.preconditionIds = item.preconditionIds;
    if (outcome.inheritedFromA15V1 === true) record.inheritedFromA15V1 = true;
    if (Array.isArray(outcome.conditions) && outcome.conditions.length > 0) record.conditions = outcome.conditions;
    if (Array.isArray(outcome.subCheckResults)) record.subCheckResults = outcome.subCheckResults;
    if (outcome.ledgerSelection) record.ledgerSelection = outcome.ledgerSelection;
    if (outcome.historicalCombinedRowSelection) {
      record.historicalCombinedRowSelection = outcome.historicalCombinedRowSelection;
    }
    record.safePause = Array.isArray(outcome.safePause) ? outcome.safePause : [];
    return record;
  });

  // Aggregation is A15 V1's, not a second implementation of the same rules.
  const { executionStatus, blockedReason } = V1.aggregate(evaluated);

  const safePauseConditions = evaluated.flatMap((r) =>
    (r.safePause ?? []).map((conditionId) => ({ item: r.id, condition: conditionId }))
  );

  return {
    contractIdentity: SUCCESSOR_CONTRACT.identity,
    contractVersion: SUCCESSOR_CONTRACT.version,
    supersedes: {
      identity: SUCCESSOR_CONTRACT.supersedes.identity,
      mode: SUCCESSOR_CONTRACT.supersedes.mode,
      v1Modified: false,
      v1RemainsRunnable: true,
      v1ContractIdentityObserved: V1.CONTRACT.identity
    },
    executionStatus,
    blockedReason,
    passReachability: SUCCESSOR_CONTRACT.passReachability.status,
    passReachabilityDerived: computePassReachability(),
    sequencing: {
      model: SUCCESSOR_CONTRACT.sequencingModel,
      correction: SUCCESSOR_CONTRACT.sequencingCorrection,
      // Empty on a correct contract. A non-empty list means the catalogue itself
      // encodes a mutual precondition, which is the defect this gate now detects.
      dependencyCycles: ctx.cycles,
      dependencyGraphValidation: ctx.dependencyGraph
    },
    reviewDisposition: "PENDING_INTERNAL_REVIEW",
    b2ThroughB6: SUCCESSOR_CONTRACT.b2ThroughB6.disposition,
    phase10AClosure: "NOT_CLAIMED",
    phase10BAuthorization: "NOT_CLAIMED",
    safePause: {
      required: safePauseConditions.length > 0,
      conditions: safePauseConditions
    },
    governedInputs: {
      authorization: {
        path: AUTHORIZATION_PATH,
        expectedSha256: AUTHORIZATION_SHA256,
        present: gi.authorization.present,
        matched: gi.authorization.matched,
        matchedForm: gi.authorization.matchedForm ?? null,
        committedAgrees: gi.authorization.committedAgrees ?? null,
        detail: gi.authorization.detail
      },
      approvedCriteria: {
        path: CRITERIA_PATH,
        expectedSha256: CRITERIA_SHA256,
        present: gi.criteriaInput.present,
        matched: gi.criteriaInput.matched,
        matchedForm: gi.criteriaInput.matchedForm ?? null,
        committedAgrees: gi.criteriaInput.committedAgrees ?? null,
        detail: gi.criteriaInput.detail,
        parsed: gi.criteria !== null,
        parseError: gi.criteriaParseError,
        ownerConfirmationOfFidelityStatus: gi.criteria?.provenance?.ownerConfirmationOfFidelityStatus ?? null
      },
      ownerCriteriaFidelityConfirmation: {
        path: FIDELITY_CONFIRMATION_PATH,
        expectedSha256: FIDELITY_CONFIRMATION_SHA256,
        present: gi.fidelityInput.present,
        matched: gi.fidelityInput.matched,
        matchedForm: gi.fidelityInput.matchedForm ?? null,
        committedAgrees: gi.fidelityInput.committedAgrees ?? null,
        detail: gi.fidelityInput.detail,
        parsed: gi.fidelity !== null,
        parseError: gi.fidelityParseError,
        ownerConfirmationOfFidelityStatus:
          gi.fidelity?.provenance?.ownerConfirmationOfFidelityStatus ?? null,
        ownerConfirmationScope: gi.fidelity?.provenance?.ownerConfirmationScope ?? null,
        confirmsCriteriaSha256: gi.fidelity?.confirms?.criteriaSha256 ?? null,
        bindsPinnedCriteriaDigest: (gi.fidelity?.confirms?.criteriaSha256 ?? null) === CRITERIA_SHA256
      },
      freezeAnchor: {
        path: FREEZE_MANIFEST_PATH,
        present: gi.freeze.present,
        rawSha256: gi.freeze.rawSha,
        canonicalSha256: gi.freeze.canonicalSha,
        frozenCommit: frozenCommitOf(gi.freeze),
        parseError: gi.freeze.parseError
      },
      ledger: { path: LEDGER_PATH, writtenByThisRunner: false }
    },
    preflight: {
      // Recorded provenance, deliberately not an equality precondition. See
      // SUCCESSOR_CONTRACT.inputsAndPrerequisites.authoringBaseHead.
      authoringBaseHead: SUCCESSOR_CONTRACT.inputsAndPrerequisites.authoringBaseHead.commit,
      observedHead: V1.readWorktreeHead(root),
      runtimeIdentity: V1.runtimeIdentity(),
      canonicalEolPolicy: CANON.CANONICAL_EOL_POLICY.policy
    },
    itemResults: evaluated
  };
}

// ── Output boundary ─────────────────────────────────────────────────────────

/**
 * The successor writes into its OWN allowlisted tree, decided structurally with
 * A15 V1's containment primitive after symlink resolution. Textual-prefix
 * siblings, `..` traversal, absolute outside paths and junction aliases are all
 * rejected, and A15 V1's own output tree is not writable from here.
 */
export function assertWritePathAllowed(outDir, baseDir = DEFAULT_ROOT) {
  const allowedBase = path.resolve(baseDir, ALLOWED_OUTPUT_PARENT);
  if (!V1.isContained(allowedBase, path.resolve(outDir))) {
    throw new Error(
      `refusing to write outside the allowlisted output directory tree (${ALLOWED_OUTPUT_PARENT}): ${outDir}`
    );
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────

/**
 * `deps` is the same narrow test seam A15 V1 documents: evaluateFn substitutes
 * an aggregated status (never evidence), runtime and readHead supply observed
 * preflight facts, write captures stdout. A normal invocation has no seam.
 *
 * Argument parsing is A15 V1's parseArgs, unchanged, so the two gates accept
 * exactly the same grammar.
 */
export function main(argv, deps = {}) {
  const args = V1.parseArgs(argv);
  const write = deps.write || ((text) => process.stdout.write(text));
  const evaluateFn = deps.evaluateFn || evaluate;
  const runtimeFn = deps.runtime ? () => deps.runtime : V1.runtimeIdentity;
  const headFn = deps.readHead || V1.readWorktreeHead;

  const root = args.root !== undefined ? path.resolve(String(args.root)) : DEFAULT_ROOT;
  const outputMode = args.out !== undefined;
  const mode = outputMode ? "OUTPUT" : args["verify-only"] ? "VERIFY_ONLY" : "REPORT_ONLY";

  if (outputMode) {
    const runtime = runtimeFn();
    if (!runtime.pass) {
      throw new Error(
        `refusing to produce governed evidence: Node runtime identity mismatch ` +
          `(expected ${JSON.stringify(runtime.expected)}, observed ${JSON.stringify(runtime.actual)})`
      );
    }
    const head = headFn(root);
    if (!head.present) {
      throw new Error(
        `refusing to produce governed evidence: root is not a readable git worktree (${head.detail}): ${root}`
      );
    }
  }

  const result = { ...evaluateFn(root), mode };
  const resultBytes = Buffer.from(JSON.stringify(result, null, 2) + "\n", "utf8");

  if (outputMode) {
    const outDir = path.resolve(String(args.out));
    assertWritePathAllowed(outDir, root);

    if (fs.existsSync(outDir)) {
      throw new Error(`refusing to overwrite existing successor evidence directory: ${outDir}`);
    }
    const parent = path.dirname(outDir);
    if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
      throw new Error(`output parent directory is missing; refusing to create it recursively: ${parent}`);
    }
    fs.mkdirSync(outDir, { recursive: false });

    const contractBytes = Buffer.from(JSON.stringify(SUCCESSOR_CONTRACT, null, 2) + "\n", "utf8");

    // The bytes written ARE the bytes hashed, exactly as A15 V1 does it.
    const artifacts = [
      { name: "SUCCESSOR_EXECUTION_RESULT.json", bytes: resultBytes },
      { name: "SUCCESSOR_EXECUTION_CONTRACT.json", bytes: contractBytes }
    ];
    for (const artifact of artifacts) {
      fs.writeFileSync(path.join(outDir, artifact.name), artifact.bytes, { flag: "wx" });
    }

    const outRel = path.relative(root, outDir).split(path.sep).join("/");
    const manifestBody =
      artifacts
        .map((artifact) => ({
          path: `${outRel}/${artifact.name}`,
          hash: createHash("sha256").update(artifact.bytes).digest("hex")
        }))
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
        .map((entry) => `${entry.hash}  ${entry.path}`)
        .join("\n") + "\n";
    fs.writeFileSync(path.join(outDir, "SUCCESSOR_EVIDENCE_MANIFEST.sha256"), Buffer.from(manifestBody, "utf8"), {
      flag: "wx"
    });
  }

  write(resultBytes.toString("utf8"));
  process.exitCode = V1.exitCodeFor(result.executionStatus);
  return result;
}

// Load-time consistency proofs. Both are pure and deterministic, and both are
// refusals to load rather than wrong answers at runtime.
assertPrecedenceConsistentWithV1();
assertPassReachabilityMatchesContract();

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main(process.argv.slice(2));
}
