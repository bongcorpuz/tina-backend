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
 * PASS reachability: unlike A15 V1, this gate CAN represent an end-to-end PASS
 * (see computePassReachability). That is a property of the catalogue, not a
 * claim about the repository: run today, every one of items 1-6 blocks, because
 * the freeze, the post-freeze campaigns, the unseen/holdout campaign and the
 * owner's fidelity confirmation do not exist yet. Being evaluable is not being
 * satisfied, and this runner never converts a missing artifact into a PASS.
 *
 * Governed inputs are PINNED BY DIGEST. The owner authorization artifact and
 * the approved-criteria artifact are both hash-pinned below. If either is
 * absent, or its bytes differ from the pinned digest, every criterion that
 * depends on it blocks as a precondition. Authorization cannot be edited
 * between approval and evaluation without this gate failing closed.
 *
 * I/O posture. No network, ever. One subprocess family only: read-only git
 * plumbing (`git cat-file blob`), reached through
 * evaluation/runner/phase10a-closure-v1/canonical-bytes.mjs, because D5
 * requires freeze digests over exact COMMITTED blob bytes and those bytes are
 * not obtainable from the working tree on a CRLF checkout. This is a declared,
 * deliberate divergence from A15 V1's no-subprocess posture; it is recorded in
 * SUCCESSOR_CONTRACT.ownerGovernedBehavior rather than glossed over. Writes are
 * confined to one allowlisted output tree, decided structurally after symlink
 * resolution using A15 V1's own containment primitive.
 *
 * This runner does not close Phase 10A, does not authorize Phase 10B, does not
 * write knowledge/CURRENT_STATE.md, and cannot set any review disposition other
 * than PENDING_INTERNAL_REVIEW.
 */
"use strict";

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
const CRITERIA_PATH = "evaluation/results/phase10a-closure-v1/PHASE10A_APPROVED_EXIT_CRITERIA_V1.json";
const CRITERIA_SHA256 = "33d303d5bc46d524abb710a005c8d90471f1d0669c32ff10a6fd48bd91f6d045";

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
  "evaluation/results/phase10a-closure-v1/OWNER_CRITERIA_FIDELITY_CONFIRMATION_V1.json";
const FIDELITY_CONFIRMATION_SHA256 = "f7dfa05ee89f5b1b53ca46dd790d09aac49b1ba7a57a77a3e5dc9be2c0d89e81";

const ORACLE_ROW_TOTAL = 3720;

// D3, verbatim. Any closure-evidence artifact for items 1-4 must carry exactly
// this sentence. A paraphrase does not satisfy a mandatory clause.
const ANTI_CIRCULARITY_CLAUSE =
  "Expectation-fitting to previously observed analyzer behavior is development evidence only and cannot establish closure.";

const HOLDOUT_KINDS = Object.freeze(["UNSEEN", "HOLDOUT", "BLIND"]);

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

function readTextUnderRoot(root, relPath) {
  const abs = path.join(root, ...relPath.split("/"));
  if (!V1.isContained(path.resolve(root), path.resolve(abs))) {
    throw new Error(`refusing to read outside the evaluated root: ${relPath}`);
  }
  if (!fs.existsSync(abs)) return { present: false, text: null, bytes: null };
  if (!fs.statSync(abs).isFile()) return { present: false, text: null, bytes: null };
  const bytes = fs.readFileSync(abs);
  return { present: true, text: bytes.toString("utf8"), bytes };
}

function readJsonUnderRoot(root, relPath) {
  const found = readTextUnderRoot(root, relPath);
  if (!found.present) return { present: false, value: null, bytes: null, parseError: null };
  try {
    return { present: true, value: JSON.parse(found.text), bytes: found.bytes, parseError: null };
  } catch (err) {
    return { present: true, value: null, bytes: found.bytes, parseError: err.message };
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
    return { present: false, relPath, expectedSha, matched: false, matchedForm: null, detail: `not found: ${relPath}` };
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
  identity: "PHASE-10A-A15-SUCCESSOR-CLOSURE-GATE-V1",
  version: 1,
  phase: "PHASE_10A",
  workUnit: "PHASE-10A-CLOSURE-V1",

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
    approvedCriteria: { path: CRITERIA_PATH, sha256: CRITERIA_SHA256, pinned: true },
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
    D3: "The anti-circularity clause is mandatory and machine-checked verbatim on every closure-evidence artifact for items 1-4.",
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
      statusNote:
        "D1 supplies the definition; D2 fixes the structure. One roadmap criterion, two mandatory subchecks, both must PASS, neither satisfies the criterion alone, and the pair may not be split into two roadmap criteria.",
      subChecks: [
        {
          id: "standalone",
          roadmapWording: "standalone exact gates",
          checkMethod: "EXACT_GATE_RESULT",
          mode: "STANDALONE",
          evidenceSource: "evaluation/results/phase10a-closure-v1/closure/EXACT_GATE_STANDALONE.json",
          stagingAttributionRequired: false
        },
        {
          id: "integrated",
          roadmapWording: "integrated exact gates",
          checkMethod: "EXACT_GATE_RESULT",
          mode: "INTEGRATED",
          evidenceSource: "evaluation/results/phase10a-closure-v1/closure/EXACT_GATE_INTEGRATED.json",
          stagingAttributionRequired: true
        }
      ]
    },
    {
      id: "frozenRuntime",
      roadmapItem: 5,
      roadmapWording: "frozen runtime",
      criterionId: "frozenRuntime",
      checkMethod: "FREEZE_MANIFEST_EXACT",
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
      "This runner imports only node:crypto, node:fs, node:path, node:url, A15 V1, and canonical-bytes.mjs, and makes no outbound call of any kind.",
    subprocessAllowed: true,
    subprocessScope: ["git cat-file blob"],
    subprocessRationale:
      "A DECLARED divergence from A15 V1's no-subprocess posture, required by D5: freeze digests must be taken over exact COMMITTED blob bytes, and on a core.autocrlf=true checkout the working tree does not contain those bytes. The only subprocess is read-only git plumbing reached through canonical-bytes.mjs; it never writes, never fetches, and never touches a remote.",
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
    status: "PASS_CAPABLE",
    predecessorStatus: V1.CONTRACT.passReachability.status,
    declaration:
      "Every one of the eleven roadmap items is evaluated by a check method with a reachable PASS branch, so an end-to-end PASS is representable. This is a property of the catalogue, NOT a claim about the repository: run against the base commit, items 1-6 block because the owner's fidelity confirmation, the freeze, the post-freeze campaigns and the unseen/holdout campaign do not exist.",
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
  if (criteriaInput.present) {
    const parsed = readJsonUnderRoot(root, CRITERIA_PATH);
    criteria = parsed.value;
    criteriaParseError = parsed.parseError;
  }
  const fidelityInput = verifyPinnedInput(root, FIDELITY_CONFIRMATION_PATH, FIDELITY_CONFIRMATION_SHA256);
  let fidelity = null;
  let fidelityParseError = null;
  if (fidelityInput.present) {
    const parsed = readJsonUnderRoot(root, FIDELITY_CONFIRMATION_PATH);
    fidelity = parsed.value;
    fidelityParseError = parsed.parseError;
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
  const conditions = [...governedInputConditions(gi), ...criterionDefinitionConditions(gi, item)];

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

// ── New check: EXACT_GATE_RESULT (roadmap item 4 subchecks) ─────────────────

function checkExactGateResult(sub, root, gi) {
  const prefix = `exactGate.${sub.id}`;
  const found = readJsonUnderRoot(root, sub.evidenceSource);
  const art = found.value ?? null;
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
    condition(
      `${prefix}.freezeManifestReferencedByDigest`,
      CONDITION_CLASS.CONTENT,
      digestPinsFreeze(gi.freeze, typeof art?.freezeManifestSha256 === "string" ? art.freezeManifestSha256 : null),
      freezeDigestDetail(gi.freeze, typeof art?.freezeManifestSha256 === "string" ? art.freezeManifestSha256 : null)
    ),
    condition(
      `${prefix}.postFreezeCampaignReferenced`,
      CONDITION_CLASS.CONTENT,
      typeof art?.postFreezeCampaignId === "string" && art.postFreezeCampaignId.length > 0,
      `postFreezeCampaignId = ${JSON.stringify(art?.postFreezeCampaignId ?? null)} (exactness measured before the freeze cannot satisfy this criterion)`
    ),
    ...antiCircularityConditions(art, prefix)
  ];

  // D6: only the integrated subcheck runs against a deployed staging runtime, so
  // only it carries the attribution obligation. Production is never accepted.
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

  return statusFromConditions(conditions, sub.id);
}

/**
 * D2: one roadmap criterion, two mandatory subchecks. The governed-input and
 * definition preconditions are evaluated ONCE at the item level, so a missing
 * authorization is reported once rather than twice, and the subcheck statuses
 * are combined by A15 V1's own precedence via worstStatus.
 */
function checkStandaloneAndIntegratedExactGates(item, root, gi) {
  const itemLevel = [...governedInputConditions(gi), ...criterionDefinitionConditions(gi, item)];
  const subCheckResults = item.subChecks.map((sub) => ({
    id: sub.id,
    roadmapWording: sub.roadmapWording,
    ...checkExactGateResult(sub, root, gi)
  }));

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

function checkFreezeManifestExact(item, root, gi) {
  const prefix = "freeze";
  const conditions = [...governedInputConditions(gi), ...criterionDefinitionConditions(gi, item)];

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
    )
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

function checkPostFreezeCampaignLedger(item, root, gi) {
  const prefix = "postFreeze";
  const conditions = [...governedInputConditions(gi), ...criterionDefinitionConditions(gi, item)];

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
      if (
        labelledHoldout &&
        campaign?.analyzerInformed === false &&
        campaign?.evidenceClass === "INDEPENDENT_CLOSURE" &&
        lineage !== null &&
        !lineage.some(namesR4)
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

export function evaluateSuccessorItem(item, root, gi) {
  switch (item.checkMethod) {
    case "CLOSURE_ENVELOPE_EXACT":
      return checkClosureEnvelopeExact(item, root, gi);
    case "MULTI_SUBCHECK":
      return checkStandaloneAndIntegratedExactGates(item, root, gi);
    case "FREEZE_MANIFEST_EXACT":
      return checkFreezeManifestExact(item, root, gi);
    case "POST_FREEZE_CAMPAIGN_LEDGER":
      return checkPostFreezeCampaignLedger(item, root, gi);
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
  "EXACT_GATE_RESULT",
  "FREEZE_MANIFEST_EXACT",
  "POST_FREEZE_CAMPAIGN_LEDGER",
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

  const evaluated = SUCCESSOR_CONTRACT.exitItems.map((item) => {
    const outcome = evaluateSuccessorItem(item, root, gi);
    const record = {
      id: item.id,
      roadmapItem: item.roadmapItem,
      roadmapWording: item.roadmapWording,
      checkMethod: item.checkMethod,
      status: outcome.status,
      detail: outcome.detail
    };
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
