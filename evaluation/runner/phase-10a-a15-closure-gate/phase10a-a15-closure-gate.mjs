#!/usr/bin/env node
/*
 * PHASE-10A-A15-FINAL-CLOSURE-GATE-V1
 *
 * Deterministic, read-only, network-disabled evaluator for the Phase-10A
 * exit items named in the controlling roadmap
 * (knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md).
 *
 * Contract-source convention (follows the committed E2 pattern exactly:
 * evaluation/runner/phase-10a14-r20/phase10a-e2-strict-canonical-inventory-closure-3.mjs
 * builds `const contract = {...}` inline and only ever writes it out as a
 * generated evidence file — there is no separately editable, pre-committed
 * contract JSON living beside that runner). CONTRACT below is the single
 * source of truth. A15_EXECUTION_CONTRACT.json is never pre-committed; it is
 * only ever produced, hash-pinned, as a generated snapshot inside a real,
 * separately authorized execution's evidence directory.
 *
 * This runner NEVER performs network I/O, NEVER writes outside its own
 * allowlisted output directory, and NEVER writes knowledge/CURRENT_STATE.md.
 * It evaluates already-produced evidence only; it does not rerun, adjudicate,
 * or invent pass criteria for any of the items it checks. A PASS execution
 * status does not by itself close Phase 10A (see CONTRACT.phase10AClosure).
 *
 * PASS reachability (see CONTRACT.passReachability): A15 V1 CANNOT currently
 * produce an end-to-end PASS. The aggregation logic can represent PASS, but
 * six of the eleven roadmap items are evaluated by check methods that have no
 * PASS branch, because their canonical definitions/evidence do not exist.
 * That gap is reported, never engineered away; becoming pass-capable requires
 * a future, separately governed contract revision.
 */
"use strict";

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "../../..");
const ALLOWED_OUTPUT_PARENT = "evaluation/results/phase-10a-a15-closure-gate";

// F3 remediation: the single exact allowlisted output directory below is the
// ONE controlling write defense. A previous revision also carried a list of
// "prohibited write patterns" (knowledge/CURRENT_STATE.md, server.js,
// security/public-health.js, evaluation/{runner,results}/phase-10a14-r20/).
// Those patterns were unreachable dead code: they were only ever evaluated
// after a path had already been required to sit inside the allowlisted
// directory, and no such path can match any of them. They provided zero
// actual protection while appearing to provide defense in depth, so they have
// been removed rather than retained as security theatre. Those locations are
// protected — but by containment in assertWritePathAllowed(), not by a
// pattern list. Tests assert the real mechanism.

// ── Path containment (F2 + F5 remediation) ───────────────────────────────────
//
// A bare `startsWith` on path TEXT is not a containment test: "…/gate-EVIL"
// textually starts with "…/gate", and "C:/Projects/tina-backend-a15-v1"
// textually starts with "C:/Projects/tina-backend". Containment is decided
// structurally with path.relative() instead, and symlinks are resolved first
// so a symlinked component cannot alias a path out of its governed root.

/**
 * Resolve `targetAbs` through symlinks. Paths that do not exist yet (a
 * not-yet-created output directory) are resolved via their nearest existing
 * ancestor, so a symlinked ancestor still cannot alias the target outside its
 * root. Falls back to the lexical resolution when nothing on the path exists.
 */
function resolveThroughSymlinks(targetAbs) {
  const resolved = path.resolve(targetAbs);
  const missingSegments = [];
  let cursor = resolved;
  for (;;) {
    try {
      const real = fs.realpathSync(cursor);
      return missingSegments.length ? path.join(real, ...missingSegments.reverse()) : real;
    } catch {
      const parent = path.dirname(cursor);
      if (parent === cursor) return resolved;
      missingSegments.push(path.basename(cursor));
      cursor = parent;
    }
  }
}

/**
 * True only when `candidateAbs` is `baseAbs` itself or a descendant of it,
 * after symlink resolution. Rejects textual-prefix siblings, `..` traversal,
 * and absolute paths outside the base.
 */
export function isContained(baseAbs, candidateAbs) {
  const realBase = resolveThroughSymlinks(baseAbs);
  const realCandidate = resolveThroughSymlinks(candidateAbs);
  const rel = path.relative(realBase, realCandidate);
  if (rel === "") return true;
  if (path.isAbsolute(rel)) return false;
  if (rel === "..") return false;
  return !rel.startsWith(`..${path.sep}`) && !rel.startsWith("../");
}

function assertContained(baseAbs, candidateAbs, what) {
  if (!isContained(baseAbs, candidateAbs)) {
    throw new Error(`${what} escapes its governed root: ${candidateAbs}`);
  }
}

// Per-item granular status vocabulary (Review Issue 2). Distinct from the
// coarse overall executionStatus (PASS | FAIL | BLOCKED).
const ITEM_STATUS = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  BLOCKED_MISSING_DEFINITION: "BLOCKED_MISSING_DEFINITION",
  BLOCKED_MISSING_EVIDENCE: "BLOCKED_MISSING_EVIDENCE",
  BLOCKED_PRECONDITION: "BLOCKED_PRECONDITION",
  NOT_APPLICABLE: "NOT_APPLICABLE"
});

// Precedence used both to combine subCheck results into one item result, and
// (in aggregate()) to combine item results into one overall result. Earlier
// entries dominate later ones.
const STATUS_PRECEDENCE = [
  ITEM_STATUS.BLOCKED_PRECONDITION,
  ITEM_STATUS.FAIL,
  ITEM_STATUS.BLOCKED_MISSING_EVIDENCE,
  ITEM_STATUS.BLOCKED_MISSING_DEFINITION,
  ITEM_STATUS.PASS
];

// F1 remediation. Exactly the check methods whose implementation contains a
// reachable ITEM_STATUS.PASS return. Any check method NOT listed here can
// never yield PASS for its item under ANY evidence — not because evidence is
// missing today, but because the method has no PASS branch at all. That is
// deliberate: the corresponding roadmap criteria have no canonical definition
// or no per-row evidence artifact in the repository, and inventing one merely
// to make the gate pass-capable is forbidden.
const CHECK_METHODS_WITH_PASS_PATH = Object.freeze([
  "PRECONDITION_GATE",
  "STATIC_SATISFIED",
  "READ_MANIFEST_AND_VERDICT"
]);

function effectiveCheckMethod(item) {
  return item.checkMethod === "MULTI_SUBCHECK" ? item.subChecks.map((s) => s.checkMethod) : [item.checkMethod];
}

/**
 * Derive, from the live check catalogue, whether A15 V1 could ever produce an
 * end-to-end PASS. Exported so a test can assert the CONTRACT's static
 * declaration matches the code, preventing the two from silently diverging.
 */
export function computePassReachability() {
  const blocking = CONTRACT.exitItems
    .filter((item) => item.checkMethod !== "NOT_APPLICABLE")
    .filter((item) => !effectiveCheckMethod(item).every((cm) => CHECK_METHODS_WITH_PASS_PATH.includes(cm)))
    .map((item) => item.id);
  return {
    aggregationLogicCanRepresentPass: true,
    currentCheckCatalogueCanProducePass: blocking.length === 0,
    itemsThatCannotCurrentlyProducePass: blocking
  };
}

export const CONTRACT = Object.freeze({
  identity: "PHASE-10A-A15-FINAL-CLOSURE-GATE-V1",
  version: 1,
  purpose:
    "Evaluate whether the Phase-10A exit criteria named in the controlling roadmap are satisfied by already-committed, hash-verifiable evidence. A15 evaluates evidence; it does not perform, rerun, or adjudicate the underlying work of those criteria, and it never itself declares Phase 10A closed.",
  relationToPhase10A:
    "One of eleven named Phase-10A exit items in the controlling roadmap. An A15 PASS is necessary but not sufficient for Phase 10A closure; a separate, explicitly authorized governance action is required afterward. See phase10AClosure.autoClose.",

  controllingSourceOfTruth: {
    roadmap: "knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md",
    roadmapSelectionRationale:
      "Filename explicitly self-identifies as 'Controlling'; the document's own header states an effective date and current controlling result; it is the most recently modified of the three committed roadmap variants (v7, v8, v9) as of contract authoring.",
    gateStateLedger: "knowledge/CURRENT_STATE.md",
    agentRules: "governance/AGENT_RULES.md (tina-dev-factory repository)"
  },

  // Exactly the 11 top-level roadmap bullets. "standalone and integrated
  // exact gates" is ONE roadmap criterion, represented as ONE top-level item
  // with two subordinate deterministic checks (Review Issue 1) rather than
  // two top-level items.
  exitItems: [
    {
      id: "decisionClosure",
      roadmapWording: "decision closure",
      classification: "CANONICAL_EVIDENCE_LOCATED",
      evidenceSource: "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_COUNTS.json",
      evidenceField: "total",
      expectedValue: 3720,
      statusNote:
        "Roadmap v9 C35 status narrative states decision=3720/3720. The oracle-counts file independently confirms the total universe size (3720). No separate per-row decision-resolution manifest was located by the authoring unit; the runner therefore verifies only the total-count precondition, and, absent that more specific manifest, an equal-count result is reported BLOCKED_MISSING_EVIDENCE rather than PASS.",
      checkMethod: "READ_JSON_FIELD_EQUALS"
    },
    {
      id: "relationClosure",
      roadmapWording: "relation closure",
      classification: "CANONICAL_EVIDENCE_LOCATED",
      evidenceSource: "evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_COUNTS.json",
      evidenceField: "total",
      expectedValue: 3720,
      statusNote: "Same basis and same limitation as decisionClosure.",
      checkMethod: "READ_JSON_FIELD_EQUALS"
    },
    {
      id: "reasonClosure",
      roadmapWording: "reason closure",
      classification: "CANONICAL_EVIDENCE_LOCATED_NOT_SATISFIED",
      evidenceSource: "knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md",
      statusNote:
        "Roadmap v9 C35 status narrative explicitly states: 'reason 3575/3720' and 'Reason closure is not proven; R20 remains IN PROGRESS.' This item is evidenced as currently NOT satisfied, not merely undefined.",
      checkMethod: "STATIC_NOT_SATISFIED"
    },
    {
      id: "standaloneAndIntegratedExactGates",
      roadmapWording: "standalone and integrated exact gates",
      classification: "NO_EXECUTABLE_DEFINITION_FOUND",
      statusNote:
        "One roadmap criterion, evaluated via two subordinate checks. Exhaustive search of knowledge/CURRENT_STATE.md and both repositories' canonical trees found zero occurrences of either 'standalone exact gate(s)' or 'integrated exact gate(s)' outside this single roadmap bullet. No definition, evidence artifact, or gate-state row exists for either.",
      checkMethod: "MULTI_SUBCHECK",
      subChecks: [
        {
          id: "standalone",
          roadmapWording: "standalone exact gates",
          checkMethod: "STATIC_BLOCKED_NO_DEFINITION"
        },
        {
          id: "integrated",
          roadmapWording: "integrated exact gates",
          checkMethod: "STATIC_BLOCKED_NO_DEFINITION"
        }
      ]
    },
    {
      id: "frozenRuntime",
      roadmapWording: "frozen runtime",
      classification: "NO_EXECUTABLE_DEFINITION_FOUND",
      statusNote: "Zero occurrences found outside the roadmap bullet itself.",
      checkMethod: "STATIC_BLOCKED_NO_DEFINITION"
    },
    {
      id: "postFreezeEvidence",
      roadmapWording: "post-freeze evidence",
      classification: "NO_EXECUTABLE_DEFINITION_FOUND",
      statusNote: "Zero occurrences found outside the roadmap bullet itself.",
      checkMethod: "STATIC_BLOCKED_NO_DEFINITION"
    },
    {
      id: "deterministicCleanCycles",
      roadmapWording: "deterministic clean cycles",
      classification: "OWNER_DECISION_D1_PRECONDITION",
      statusNote:
        "Owner decision D1 (A15 contract authoring unit) treats this as an A15 execution precondition. No dedicated evidence source distinguishes 'deterministic clean cycles' from 'staging clean cycles'; both are evaluated against the single 'Deterministic clean/staging closure' gate-state row in knowledge/CURRENT_STATE.md, currently UNSATISFIED. Kept as its own top-level roadmap item (not merged with stagingCleanCycles) because the controlling roadmap lists them as two separate bullets; only 'standalone and integrated exact gates' was merged, per Review Issue 1.",
      checkMethod: "PRECONDITION_GATE"
    },
    {
      id: "stagingCleanCycles",
      roadmapWording: "staging clean cycles",
      classification: "OWNER_DECISION_D1_PRECONDITION",
      statusNote: "See deterministicCleanCycles. Same evidence source and same precondition gate; kept as a separate top-level item for roadmap-bullet traceability.",
      checkMethod: "PRECONDITION_GATE"
    },
    {
      id: "independentReview",
      roadmapWording: "independent review",
      classification: "CANONICAL_EVIDENCE_LOCATED",
      statusNote:
        "Gate-state ledger records 'R4 bounded development-governance review' = ACCEPTED and 'Post-R4 external-review gate' = SATISFIED.",
      checkMethod: "STATIC_SATISFIED"
    },
    {
      id: "e2",
      roadmapWording: "E2",
      classification: "CANONICAL_EVIDENCE_LOCATED",
      evidenceSource: "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3/E2_EVIDENCE_MANIFEST.sha256",
      internalReviewSource: "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3_INTERNAL_REVIEW.md",
      expectedVerdict: "ACCEPTED_FOR_E2_PUBLICATION",
      statusNote:
        "E2 internal review verdict is ACCEPTED_FOR_E2_PUBLICATION; separately-governed publication (push/PR/merge) was independently verified complete in prior session units (commit 9cf340bc..., merged via PR #5 into origin/feature/source-availability-engine-v1 at 27bd3425...).",
      checkMethod: "READ_MANIFEST_AND_VERDICT"
    },
    {
      id: "a15",
      roadmapWording: "A15",
      classification: "SELF",
      statusNote: "This item is the gate itself; it does not evaluate itself.",
      checkMethod: "NOT_APPLICABLE"
    }
  ],

  b2ThroughB6: {
    disposition: "OPEN_UNCHANGED_OUT_OF_SCOPE",
    rationale:
      "Owner decision D2 (this session), following the E2 precedent (E2_EXECUTION_CONTRACT.json b2ThroughB6.disposition = OPEN_UNCHANGED_OUT_OF_SCOPE). B2-B6 do not appear in the controlling roadmap's eleven-item Phase-10A completion list at all; they are tracked only as a separate gate-state ledger row, with no definitional content located anywhere in either repository's canonical trees.",
    evaluatedByA15: false,
    modifiedByA15: false
  },

  inputsAndPrerequisites: {
    startingHead: {
      branch: "feature/source-availability-engine-v1",
      commit: "27bd342563c4bb535bc2c2ea1ea02bac8c70de51"
    },
    nodeRuntimeIdentity: {
      expectedPlatform: "win32",
      expectedArchitecture: "x64"
    }
  },

  ownerGovernedBehavior: {
    networkAllowed: false,
    networkRationale:
      "Owner decision D3: A15 is an evidence-evaluation gate, not a live staging/network execution surface. Untracked prior-attempt files in this working tree (evaluation/runner/phase-10a14-r20/phase10a-a15-final-closure*.mjs, unrelated '10A15'-numbered fact-check reruns) pursued a live, credentialed, network-calling design across five attempts and never reached a semantic PASS, terminating at A15_TECHNICAL_INCOMPLETE (evaluation/results/phase-10a14-r20/PHASE_10A15_V4B_TERMINAL_TECHNICAL_INCOMPLETE_REVIEW_1/A15_V4B_TERMINAL_REVIEW.json, untracked, not canonical). D3 deliberately avoids repeating that failure mode.",
    overwriteAllowed: false,
    outputOnlyAtExactAllowlistedDirectory: true,
    readOnlyWithRespectToEvidenceAndRuntime: true
  },

  allowedPaths: [
    "evaluation/runner/phase-10a-a15-closure-gate/phase10a-a15-closure-gate.mjs",
    "evaluation/results/phase-10a-a15-closure-gate/**"
  ],

  prohibitedPaths: [
    "knowledge/CURRENT_STATE.md",
    "server.js",
    "security/public-health.js",
    "B2-B6 artifacts",
    "all production/runtime/oracle/validator/test/source inputs",
    "evaluation/runner/phase-10a14-r20/**",
    "evaluation/results/phase-10a14-r20/**"
  ],

  statusVocabulary: {
    itemStatus: Object.values(ITEM_STATUS),
    executionStatus: ["PASS", "FAIL", "BLOCKED"],
    executionStatusNote:
      "Coarse, machine-checked overall status only. Per-item status uses the granular itemStatus vocabulary above; overall executionStatus is derived from it by precedence (see STATUS_PRECEDENCE). Separate from review disposition per owner decision D6 (do not overload one status field).",
    reviewDisposition: {
      values: ["PENDING_INTERNAL_REVIEW", "PENDING_EXTERNAL_REVIEW", "ACCEPTED_FOR_A15_CLOSURE", "CHANGES_REQUIRED"],
      note:
        "Owner decision D6: review disposition is a separate field the runner can only ever set to PENDING_INTERNAL_REVIEW. ACCEPTED_FOR_A15_CLOSURE may only be written by a human/independent-review process, never by this runner. This vocabulary is deliberately distinct from tina_harness/RELEASE_GATE.md's RELEASE APPROVED / APPROVED WITH WARNINGS / HOLD / REJECTED vocabulary, which governs the separate production/release gate."
    }
  },

  review: {
    internalReviewRequired: true,
    externalReviewRequired: true,
    externalReviewRationale:
      "Owner decision D5: A15 is explicitly the final Phase-10A closure gate, a materially higher-stakes claim than any single evidence-inventory closure (e.g. E2, which set externalReviewRequired=false for itself only). An internal swarm Reviewer does not satisfy this requirement.",
    ownerAuthorizationRequiredBeforeExecution: true
  },

  // F1 remediation: the honest, machine-readable statement of what A15 V1 can
  // and cannot currently produce. These two facts are deliberately separated
  // because conflating them is what produced the earlier false claim that
  // "A15 V1 is capable of PASS".
  passReachability: {
    status: "REQUIRES_FUTURE_CONTRACT_REVISION",
    aggregationLogicCanRepresentPass: true,
    currentCheckCatalogueCanProducePass: false,
    itemsThatCannotCurrentlyProducePass: [
      "decisionClosure",
      "relationClosure",
      "reasonClosure",
      "standaloneAndIntegratedExactGates",
      "frozenRuntime",
      "postFreezeEvidence"
    ],
    checkMethodsWithNoPassPath: ["READ_JSON_FIELD_EQUALS", "STATIC_NOT_SATISFIED", "STATIC_BLOCKED_NO_DEFINITION"],
    statement:
      "A15 V1 is intentionally fail-closed against the currently defined canonical evidence model. It can truthfully return FAIL/BLOCKED and enumerate closure gaps, but it CANNOT return an end-to-end PASS: six of the eleven roadmap items are evaluated by check methods that contain no PASS branch, because those criteria have no canonical definition (standalone/integrated exact gates, frozen runtime, post-freeze evidence), are evidenced as not satisfied (reason closure), or have only aggregate-count evidence with no per-row resolution manifest (decision closure, relation closure). This is a contract capability limitation and a future-version requirement, NOT a defect in fail-closed behavior and NOT a licence to invent definitions, paths, thresholds, manifests, or pass criteria to make the gate passable. A15 may become pass-capable only in a future, separately governed contract revision, and only after the missing canonical definitions and evidence actually exist.",
    doNotInventCriteria:
      "The absence of canonical definitions/evidence is real governance information and must be reported as such, never engineered away."
  },

  phase10AClosure: {
    autoClose: false,
    statement:
      "An A15 PASS execution status, and/or an ACCEPTED_FOR_A15_CLOSURE review disposition, does not by itself change Phase 10A from OPEN. A separate, explicitly owner-authorized Phase 10A closure action is required afterward, and A15 does not authorize Phase 10B."
  },

  gitPublication: {
    stageCommitPushAuthorizedByThisContract: false,
    status: "NOT_APPLICABLE_THIS_UNIT_IS_AUTHORING_ONLY"
  },

  rollback:
    "This contract and its runner are read-only with respect to all evidence, runtime, and source inputs. No rollback procedure is required for evaluation runs. If an interrupted output-mode invocation leaves a partial results directory, preserve diagnostics and remove only that directory under separately authorized cleanup."
});

export function loadContract() {
  return CONTRACT;
}

function readJsonUnderRoot(root, relPath) {
  const abs = path.join(root, ...relPath.split("/"));
  assertContained(root, abs, `evidence read path '${relPath}'`);
  if (!fs.existsSync(abs)) return { present: false, value: null };
  const raw = fs.readFileSync(abs, "utf8");
  return { present: true, value: JSON.parse(raw), raw };
}

function readTextUnderRoot(root, relPath) {
  const abs = path.join(root, ...relPath.split("/"));
  assertContained(root, abs, `evidence read path '${relPath}'`);
  if (!fs.existsSync(abs)) return { present: false, text: null };
  return { present: true, text: fs.readFileSync(abs, "utf8") };
}

function extractGateRowValue(currentStateText, rowLabel) {
  // Matches "| <rowLabel> | `VALUE` |" style rows used throughout CURRENT_STATE.md.
  const escaped = rowLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\|\\s*${escaped}\\s*\\|\\s*\`([^\`]+)\``, "i");
  const match = currentStateText.match(re);
  return match ? match[1] : null;
}

function worstStatus(statuses) {
  for (const candidate of STATUS_PRECEDENCE) {
    if (statuses.includes(candidate)) return candidate;
  }
  return ITEM_STATUS.PASS;
}

export function evaluateCheck(check, root) {
  switch (check.checkMethod) {
    case "READ_JSON_FIELD_EQUALS": {
      const { present, value } = readJsonUnderRoot(root, check.evidenceSource);
      if (!present) {
        return { status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE, detail: `not found: ${check.evidenceSource}` };
      }
      const actual = value[check.evidenceField];
      if (actual !== check.expectedValue) {
        return {
          status: ITEM_STATUS.FAIL,
          detail: `${check.evidenceField} expected ${check.expectedValue}, found ${actual}`
        };
      }
      // Total-count evidence exists and matches, but no per-row resolution
      // manifest was located (see statusNote): report the more specific gap
      // rather than a full PASS.
      return {
        status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE,
        detail: `total count confirmed (${actual}); per-row resolution manifest not located`
      };
    }

    case "STATIC_NOT_SATISFIED": {
      return { status: ITEM_STATUS.FAIL, detail: check.statusNote };
    }

    case "STATIC_BLOCKED_NO_DEFINITION": {
      return { status: ITEM_STATUS.BLOCKED_MISSING_DEFINITION, detail: check.statusNote || check.roadmapWording };
    }

    case "PRECONDITION_GATE": {
      const { present, text } = readTextUnderRoot(root, "knowledge/CURRENT_STATE.md");
      if (!present) {
        return { status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE, detail: "knowledge/CURRENT_STATE.md not found" };
      }
      const value = extractGateRowValue(text, "Deterministic clean/staging closure");
      if (value === null) {
        return { status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE, detail: "gate row not found in CURRENT_STATE.md" };
      }
      if (value !== "SATISFIED") {
        return { status: ITEM_STATUS.BLOCKED_PRECONDITION, detail: `Deterministic clean/staging closure = ${value}` };
      }
      return { status: ITEM_STATUS.PASS, detail: "Deterministic clean/staging closure = SATISFIED" };
    }

    case "STATIC_SATISFIED": {
      const { present, text } = readTextUnderRoot(root, "knowledge/CURRENT_STATE.md");
      if (!present) {
        return { status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE, detail: "knowledge/CURRENT_STATE.md not found" };
      }
      const r4 = extractGateRowValue(text, "R4 bounded development-governance review");
      const postR4 = extractGateRowValue(text, "Post-R4 external-review gate");
      if (r4 === "ACCEPTED" && postR4 === "SATISFIED") {
        return { status: ITEM_STATUS.PASS, detail: `R4=${r4}, Post-R4=${postR4}` };
      }
      return { status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE, detail: `R4=${r4}, Post-R4=${postR4}` };
    }

    case "READ_MANIFEST_AND_VERDICT": {
      const manifest = readTextUnderRoot(root, check.evidenceSource);
      const review = readTextUnderRoot(root, check.internalReviewSource);
      if (!manifest.present || !review.present) {
        return { status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE, detail: "manifest or internal review file not found" };
      }
      if (!review.text.includes(check.expectedVerdict)) {
        return {
          status: ITEM_STATUS.FAIL,
          detail: `expected verdict '${check.expectedVerdict}' not found in internal review`
        };
      }
      return { status: ITEM_STATUS.PASS, detail: `verdict confirmed: ${check.expectedVerdict}` };
    }

    case "NOT_APPLICABLE":
      return { status: ITEM_STATUS.NOT_APPLICABLE, detail: "self-referential item" };

    default:
      throw new Error(`unknown checkMethod: ${check.checkMethod}`);
  }
}

export function evaluateItem(item, root) {
  if (item.checkMethod === "MULTI_SUBCHECK") {
    const subCheckResults = item.subChecks.map((sub) => ({
      id: sub.id,
      roadmapWording: sub.roadmapWording,
      ...evaluateCheck(sub, root)
    }));
    const status = worstStatus(subCheckResults.map((r) => r.status));
    return {
      id: item.id,
      status,
      detail: item.statusNote,
      subCheckResults
    };
  }
  const result = evaluateCheck(item, root);
  return { id: item.id, status: result.status, detail: result.detail };
}

export function aggregate(itemResults) {
  const relevant = itemResults.filter((r) => r.status !== ITEM_STATUS.NOT_APPLICABLE);
  const statuses = relevant.map((r) => r.status);

  if (statuses.includes(ITEM_STATUS.BLOCKED_PRECONDITION)) {
    return { executionStatus: "BLOCKED", blockedReason: "PRECONDITION_UNSATISFIED" };
  }
  if (statuses.includes(ITEM_STATUS.FAIL)) {
    return { executionStatus: "FAIL", blockedReason: null };
  }
  if (statuses.includes(ITEM_STATUS.BLOCKED_MISSING_EVIDENCE)) {
    return { executionStatus: "BLOCKED", blockedReason: "MISSING_EVIDENCE" };
  }
  if (statuses.includes(ITEM_STATUS.BLOCKED_MISSING_DEFINITION)) {
    return { executionStatus: "BLOCKED", blockedReason: "NO_EXECUTABLE_DEFINITION" };
  }
  return { executionStatus: "PASS", blockedReason: null };
}

export function evaluate(root) {
  // itemResults preserves EVERY item's finding, in full, regardless of which
  // one determines overall precedence (Review Issue 2).
  const itemResults = CONTRACT.exitItems.map((item) => evaluateItem(item, root));
  const { executionStatus, blockedReason } = aggregate(itemResults);

  return {
    contractIdentity: CONTRACT.identity,
    contractVersion: CONTRACT.version,
    executionStatus,
    blockedReason,
    passReachability: CONTRACT.passReachability.status,
    reviewDisposition: "PENDING_INTERNAL_REVIEW",
    b2ThroughB6: CONTRACT.b2ThroughB6.disposition,
    phase10AClosure: "NOT_CLAIMED",
    phase10BAuthorization: "NOT_CLAIMED",
    itemResults
  };
}

/**
 * The controlling write defense: the output directory must be the exact
 * allowlisted directory or a descendant of it, decided structurally after
 * symlink resolution. Textual-prefix siblings (…-EVIL), `..` traversal,
 * absolute outside paths, and symlink aliases are all rejected.
 */
export function assertWritePathAllowed(outDir, cwd = process.cwd()) {
  const allowedBase = path.resolve(cwd, ALLOWED_OUTPUT_PARENT);
  if (!isContained(allowedBase, path.resolve(outDir))) {
    throw new Error(
      `refusing to write outside the exact allowlisted output directory ` +
        `(${ALLOWED_OUTPUT_PARENT}): ${outDir}`
    );
  }
}

function main(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      args.set(key, next && !next.startsWith("--") ? next : true);
    }
  }

  const root = args.has("root") ? path.resolve(String(args.get("root"))) : DEFAULT_ROOT;
  const result = evaluate(root);

  if (args.get("verify-only")) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else if (args.has("out")) {
    const outDir = path.resolve(String(args.get("out")));
    assertWritePathAllowed(outDir);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "A15_EXECUTION_RESULT.json"),
      JSON.stringify(result, null, 2) + "\n"
    );
    // Execution-time hash-pinned contract snapshot (Review Issue 3): the
    // exact embedded CONTRACT this run used, copied verbatim into the
    // evidence directory. This file is never pre-committed beside the
    // runner; it only ever exists as a generated per-run artifact, matching
    // the committed E2 convention.
    const contractSnapshot = JSON.stringify(CONTRACT, null, 2) + "\n";
    fs.writeFileSync(path.join(outDir, "A15_EXECUTION_CONTRACT.json"), contractSnapshot);
    const resultHash = createHash("sha256").update(JSON.stringify(result)).digest("hex");
    const contractHash = createHash("sha256").update(contractSnapshot).digest("hex");
    fs.writeFileSync(
      path.join(outDir, "A15_EVIDENCE_MANIFEST.sha256"),
      `${resultHash}  A15_EXECUTION_RESULT.json\n${contractHash}  A15_EXECUTION_CONTRACT.json\n`
    );
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }

  if (result.executionStatus === "FAIL") process.exitCode = 1;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main(process.argv.slice(2));
}

assert.ok(loadContract, "contract loader must be defined");
