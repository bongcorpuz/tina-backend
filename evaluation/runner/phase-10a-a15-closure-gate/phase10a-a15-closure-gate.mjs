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
 * This runner NEVER performs network I/O, NEVER spawns a subprocess, NEVER
 * writes outside its own allowlisted output directory tree, and NEVER writes
 * knowledge/CURRENT_STATE.md. It evaluates already-produced evidence only; it
 * does not rerun, adjudicate, or invent pass criteria for any of the items it
 * checks. A PASS execution status does not by itself close Phase 10A (see
 * CONTRACT.phase10AClosure).
 *
 * PASS reachability (see CONTRACT.passReachability): A15 V1 CANNOT currently
 * produce an end-to-end PASS. The aggregation logic can represent PASS, but
 * six of the eleven roadmap items are evaluated by check methods that have no
 * PASS branch, because their canonical definitions/evidence do not exist.
 * That gap is reported, never engineered away; becoming pass-capable demands
 * a future, separately governed contract revision.
 *
 * Every declaration in CONTRACT is enforced by executable code in this file.
 * Where a property is deliberately NOT enforced it says so explicitly
 * (see inputsAndPrerequisites.authoringBaseHead.enforced === false).
 */
"use strict";

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "../../..");
const ALLOWED_OUTPUT_PARENT = "evaluation/results/phase-10a-a15-closure-gate";
const LEDGER_PATH = "knowledge/CURRENT_STATE.md";

// The single exact allowlisted output directory tree below is the ONE
// controlling write defense. A previous revision also carried a list of
// "prohibited write patterns" (knowledge/CURRENT_STATE.md, server.js,
// security/public-health.js, evaluation/{runner,results}/phase-10a14-r20/).
// Those patterns were unreachable dead code: they were only ever evaluated
// after a path had already been required to sit inside the allowlisted
// directory, and no such path can match any of them. They provided zero
// actual protection while appearing to provide defense in depth, so they have
// been removed rather than retained as security theatre. Those locations are
// protected — but by containment in assertWritePathAllowed(), not by a
// pattern list. Tests assert the real mechanism.

// ── Deep immutability ────────────────────────────────────────────────────────
//
// Object.freeze() is shallow: it protects CONTRACT's own properties but leaves
// every nested item, subCheck, and array element writable. A contract that can
// be mutated at depth after import is not a source of truth, so freeze the
// whole graph.
function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) deepFreeze(value[key]);
  return value;
}

// ── Path containment ─────────────────────────────────────────────────────────
//
// A bare `startsWith` on path TEXT is not a containment test: "…/gate-EVIL"
// textually starts with "…/gate", and "C:/Projects/tina-backend-a15-v1"
// textually starts with "C:/Projects/tina-backend". Containment is decided
// structurally with path.relative() instead, and symlinks/junctions are
// resolved first so a reparse point cannot alias a path out of its root.

/**
 * Resolve `targetAbs` through symlinks and junctions. Paths that do not exist
 * yet (a not-yet-created output directory) are resolved via their nearest
 * existing ancestor, so a symlinked ancestor still cannot alias the target
 * outside its root. Falls back to the lexical resolution when nothing on the
 * path exists.
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

// Per-item granular status vocabulary. Distinct from the coarse overall
// executionStatus (PASS | FAIL | BLOCKED).
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

/**
 * Machine-readable exit contract. BLOCKED is deliberately distinct from both
 * PASS and FAIL: a closure gate that cannot evaluate its criteria must not be
 * indistinguishable from one that evaluated them successfully. Collapsing
 * BLOCKED into 0 would let CI treat an unevaluable final gate as green.
 */
export const EXIT_CODES = Object.freeze({ PASS: 0, FAIL: 1, BLOCKED: 2 });

/** Map an overall executionStatus to its process exit code, fail-closed. */
export function exitCodeFor(executionStatus) {
  if (!Object.prototype.hasOwnProperty.call(EXIT_CODES, String(executionStatus))) {
    throw new Error(`unmappable executionStatus '${executionStatus}': refusing to guess an exit code`);
  }
  return EXIT_CODES[executionStatus];
}

// Exactly the check methods whose implementation contains a reachable
// ITEM_STATUS.PASS return. Any check method NOT listed here can never yield
// PASS for its item under ANY evidence — not because evidence is missing
// today, but because the method has no PASS branch at all. That is
// deliberate: the corresponding roadmap criteria have no canonical definition
// or no per-row evidence artifact in the repository, and inventing one merely
// to make the gate pass-capable is forbidden.
const CHECK_METHODS_WITH_PASS_PATH = Object.freeze([
  "PRECONDITION_GATE",
  "LEDGER_ROW_EQUALS",
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

/**
 * How a gate-state row is selected when knowledge/CURRENT_STATE.md carries the
 * same label in more than one historical block. The ledger is append-only and
 * newest-first: CURRENT_STATE.md states that the topmost additive block is the
 * latest controlling resume point and that all older blocks below it remain
 * preserved as history. The first matching row in document order is therefore
 * the controlling one. This rule is declared, not implicit, because divergent
 * duplicates genuinely exist (for example the "Deterministic clean/staging
 * closure" row appears with different dispositions in different blocks).
 */
export const LEDGER_ROW_SELECTION_RULE = Object.freeze({
  rule: "FIRST_MATCHING_ROW_IN_DOCUMENT_ORDER",
  basis:
    "knowledge/CURRENT_STATE.md is an append-only, newest-first ledger: the topmost additive block is declared to be the latest controlling resume point and all older blocks below it are preserved history. The first matching row in document order is therefore the newest, controlling row.",
  ambiguityHandling:
    "Two or more matching rows inside the SAME table cannot be ordered by the newest-first block convention, so they are rejected as AMBIGUOUS (fail closed) rather than resolved by an arbitrary choice.",
  malformedHandling:
    "If the controlling (first) matching row's value cell does not begin with a backticked token, the row is reported MALFORMED and evaluation fails closed. It deliberately does NOT fall through to an older, superseded, well-formed row."
});

export const CONTRACT = deepFreeze({
  identity: "PHASE-10A-A15-FINAL-CLOSURE-GATE-V1",
  version: 1,
  purpose:
    "Evaluate whether the Phase-10A exit criteria named in the controlling roadmap are satisfied by already-committed, hash-verifiable evidence. A15 evaluates evidence; it does not perform, rerun, or adjudicate the underlying work of those criteria, and it never itself declares Phase 10A closed.",
  relationToPhase10A:
    "One of eleven named Phase-10A exit items in the controlling roadmap. An A15 PASS is necessary but not sufficient for Phase 10A closure; a separate, explicitly authorized governance action is needed afterward. See phase10AClosure.autoClose.",

  controllingSourceOfTruth: {
    roadmap: "knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md",
    roadmapSelectionRationale:
      "knowledge/CURRENT_STATE.md records the promotion decision directly: its 'ROADMAP V9 PROMOTION' block states 'Roadmap v9 promoted in C31' = true, 'Roadmap v9 source-of-truth hierarchy' = PASS, and fixes the hierarchy as 'committed evidence/frozen artifacts -> CURRENT_STATE -> Roadmap v9 -> Roadmap v8 -> Roadmap v7 historical'. v9 is therefore controlling by recorded governance decision. Filesystem modification time is deliberately NOT used as a selection basis: mtime is not committed state, is not reproducible across clones or checkouts, and would let an incidental touch reassign the source of truth.",
    gateStateLedger: "knowledge/CURRENT_STATE.md",
    gateStateLedgerRowSelection: LEDGER_ROW_SELECTION_RULE.rule,
    agentRules: "governance/AGENT_RULES.md (tina-dev-factory repository)"
  },

  // Exactly the 11 top-level roadmap bullets. "standalone and integrated
  // exact gates" is ONE roadmap criterion, represented as ONE top-level item
  // with two subordinate deterministic checks rather than two top-level items.
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
        "One roadmap criterion, evaluated via two subordinate checks. The criterion phrase occurs only as this roadmap bullet itself, replicated verbatim in Roadmap v7, Roadmap v8, and the committed v9 draft/snapshot copies under evaluation/results/phase-10a14-r20/. knowledge/CURRENT_STATE.md contains no occurrence of 'exact gate' in any form, and the tina-dev-factory governance tree contains none either. What is absent is therefore not the words but the substance: no gate-state row, no declared pass condition, and no evidence artifact adjudicates either subordinate gate, so neither can be evaluated.",
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
      statusNote:
        "The phrase 'frozen runtime' is NOT absent from the repository: it appears in roughly twenty committed documents, always as a descriptive property of one unit's locked runtime (for example evaluation/results/phase-10a14-e1/WS1_PREFLIGHT_AND_RUNTIME_LOCK.md, evaluation/results/phase-10a14-r20/FROZEN_PLAN.md and EVIDENCE_CONTRACT.md, and evaluation/results/phase-10a14-full-factcheck-rerun-4-independent-review-1/frozen-runtime-and-configuration-review.md). None of those defines it as a Phase-10A EXIT criterion: knowledge/CURRENT_STATE.md contains no 'frozen runtime' gate-state row at all, and no committed artifact declares a pass condition for the roadmap bullet or adjudicates it. The gap is a missing exit-criterion definition, not a missing phrase, and it is reported as BLOCKED_MISSING_DEFINITION rather than resolved by borrowing a unit-scoped runtime lock as if it were the Phase-10A gate.",
      checkMethod: "STATIC_BLOCKED_NO_DEFINITION"
    },
    {
      id: "postFreezeEvidence",
      roadmapWording: "post-freeze evidence",
      classification: "NO_EXECUTABLE_DEFINITION_FOUND",
      statusNote:
        "The criterion phrase 'post-freeze evidence' occurs only as this roadmap bullet and its verbatim replications in Roadmap v7, Roadmap v8, and the committed v9 draft/snapshot copies. The bare word 'post-freeze' does occur elsewhere, but only in unrelated phrases ('COMMIT 6 post-freeze campaigns and focused evidence' in knowledge/CURRENT_STATE.md and FREEZE_SEQUENCE.md; a no-expectation-change rule in DEVELOPMENT_ORACLE_DESIGN.md), none of which defines this exit criterion. knowledge/CURRENT_STATE.md carries no gate-state row for it and no committed artifact declares a pass condition, so it is reported as BLOCKED_MISSING_DEFINITION.",
      checkMethod: "STATIC_BLOCKED_NO_DEFINITION"
    },
    {
      id: "deterministicCleanCycles",
      roadmapWording: "deterministic clean cycles",
      classification: "OWNER_DECISION_D1_PRECONDITION",
      evidenceSource: "knowledge/CURRENT_STATE.md",
      ledgerRowLabel: "Deterministic clean/staging closure",
      expectedValue: "SATISFIED",
      statusNote:
        "Owner decision D1 (A15 contract authoring unit) treats this as an A15 execution precondition. No dedicated evidence source distinguishes 'deterministic clean cycles' from 'staging clean cycles'; both are evaluated against the single 'Deterministic clean/staging closure' gate-state row in knowledge/CURRENT_STATE.md, currently UNSATISFIED. That label occurs in several historical blocks with divergent dispositions, and a separate hyphenated label ('Deterministic clean-staging closure') also exists; row selection follows gateStateLedgerRowSelection and label matching is exact and case-sensitive, so the two labels are never conflated. Kept as its own top-level roadmap item (not merged with stagingCleanCycles) because the controlling roadmap lists them as two separate bullets.",
      checkMethod: "PRECONDITION_GATE"
    },
    {
      id: "stagingCleanCycles",
      roadmapWording: "staging clean cycles",
      classification: "OWNER_DECISION_D1_PRECONDITION",
      evidenceSource: "knowledge/CURRENT_STATE.md",
      ledgerRowLabel: "Deterministic clean/staging closure",
      expectedValue: "SATISFIED",
      statusNote:
        "See deterministicCleanCycles. Same evidence source and same precondition gate; kept as a separate top-level item for roadmap-bullet traceability.",
      checkMethod: "PRECONDITION_GATE"
    },
    {
      id: "independentReview",
      roadmapWording: "independent review",
      classification: "CANONICAL_EVIDENCE_LOCATED_NOT_SATISFIED",
      evidenceSource: "knowledge/CURRENT_STATE.md",
      ledgerRowLabel: "Post-R4 independent external Phase 10A review",
      expectedValue: "SATISFIED",
      statusNote:
        "The controlling criterion is the Phase-10A-scoped independent external review, whose gate-state row records UNSATISFIED, and whose block prose states that 'the separate Roadmap requirement for independent external Phase 10A closure review remains unsatisfied'. A previous revision instead read 'R4 bounded development-governance review' = ACCEPTED together with 'Post-R4 external-review gate' = SATISFIED and mapped that pair to PASS. That mapping was false: CURRENT_STATE.md states that R4 is analyzer-informed DEVELOPMENT evidence, 'not independent, unseen, blind, or holdout evidence', and separately records the Phase-10A independent review as UNSATISFIED and the required reviewer as not yet invoked. Those rows are a different, narrower gate and are no longer read by this item. Because the controlling evidence exists and says UNSATISFIED, the truthful evaluation is FAIL, not BLOCKED_MISSING_EVIDENCE.",
      checkMethod: "LEDGER_ROW_EQUALS"
    },
    {
      id: "e2",
      roadmapWording: "E2",
      classification: "CANONICAL_EVIDENCE_LOCATED",
      evidenceSource:
        "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3/E2_EVIDENCE_MANIFEST.sha256",
      internalReviewSource:
        "evaluation/results/phase-10a14-r20/PHASE_10A14_E2_STRICT_CANONICAL_INVENTORY_CLOSURE_3_INTERNAL_REVIEW.md",
      expectedVerdict: "ACCEPTED_FOR_E2_PUBLICATION",
      statusNote:
        "E2 internal review verdict is ACCEPTED_FOR_E2_PUBLICATION; separately-governed publication (push/PR/merge) was independently verified complete in prior session units (commit 9cf340bc..., merged via PR #5 into origin/feature/source-availability-engine-v1 at 27bd3425...). This item VERIFIES the referenced manifest: every entry is rehashed from the bytes on disk and every referenced artifact must exist inside the evidence directory. The verdict is read from the internal review's structural '## Verdict' section, not by scanning the whole document for the expected token.",
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
      "Owner decision D2, following the E2 precedent (E2_EXECUTION_CONTRACT.json b2ThroughB6.disposition = OPEN_UNCHANGED_OUT_OF_SCOPE). B2-B6 do not appear in the controlling roadmap's eleven-item Phase-10A completion list at all; they are tracked only as a separate gate-state ledger row, with no definitional content located anywhere in either repository's canonical trees.",
    evaluatedByA15: false,
    modifiedByA15: false
  },

  inputsAndPrerequisites: {
    // Provenance, NOT a precondition. Recording it as an enforced "starting
    // head" would be a false claim: this unit only authors the contract and
    // runner. The real, separately authorized A15 execution is a future unit
    // whose base commit is not knowable here, and the committed E2 precedent
    // likewise records startingHeadTracked=false. The observed head IS read
    // and recorded on every run (see result.preflight.observedHead), and an
    // evidence-producing run refuses a root whose head cannot be read at all.
    authoringBaseHead: {
      branch: "feature/source-availability-engine-v1",
      commit: "27bd342563c4bb535bc2c2ea1ea02bac8c70de51",
      enforced: false,
      role: "PROVENANCE_RECORD",
      rationale:
        "The commit above is the PR base this contract was authored against, recorded so evidence can be traced back to it. It is deliberately not enforced as an equality precondition, because a governed A15 execution will legitimately run from a later commit; enforcing it would either be dead (never true) or would have to be edited at execution time, which is worse than recording it honestly. What IS enforced for evidence-producing runs is that the root is a readable git worktree whose branch and commit are captured into the evidence.",
      observedHeadRecordedInResult: true,
      readableHeadRequiredForOutputMode: true
    },
    nodeRuntimeIdentity: {
      expectedPlatform: "win32",
      expectedArchitecture: "x64",
      enforced: true,
      enforcementScope: "EVIDENCE_PRODUCING_OUTPUT_MODE",
      basis:
        "Matches the committed E2 precedent, which hard-asserts runtime identity before producing evidence. Read-only report and verify-only invocations record the observed identity but do not refuse, so the gate can still be inspected from any platform without being able to mint evidence there."
    }
  },

  ownerGovernedBehavior: {
    networkAllowed: false,
    networkRationale:
      "Owner decision D3: A15 is an evidence-evaluation gate, not a live staging/network execution surface. Untracked prior-attempt files in this working tree (evaluation/runner/phase-10a14-r20/phase10a-a15-final-closure*.mjs, unrelated '10A15'-numbered fact-check reruns) pursued a live, credentialed, network-calling design across five attempts and never reached a semantic PASS, terminating at A15_TECHNICAL_INCOMPLETE (evaluation/results/phase-10a14-r20/PHASE_10A15_V4B_TERMINAL_TECHNICAL_INCOMPLETE_REVIEW_1/A15_V4B_TERMINAL_REVIEW.json, untracked, not canonical). D3 deliberately avoids repeating that failure mode. Enforced structurally: this runner imports only node:crypto, node:fs, node:path, and node:url, performs no subprocess execution, and makes no outbound call of any kind.",
    overwriteAllowed: false,
    overwriteEnforcement:
      "An evidence-producing run refuses when the output directory already exists, creates it non-recursively, and writes every artifact with the exclusive-create flag 'wx', so a concurrent or repeated invocation cannot replace bytes that already exist.",
    outputConfinedToAllowlistedDirectoryTree: true,
    outputConfinementSemantics:
      "The output directory must be the allowlisted directory 'evaluation/results/phase-10a-a15-closure-gate' itself or a descendant of it, decided structurally after symlink/junction resolution. Descendants are intended: allowedPaths declares the tree with a '/**' suffix, and a per-run evidence subdirectory is the E2 convention. Exact-single-directory semantics are deliberately NOT claimed, because the code does not enforce them.",
    readOnlyWithRespectToEvidenceAndRuntime: true
  },

  // Machine-readable exit mapping, kept in the contract because downstream
  // automation depends on it. Asserted against the implemented EXIT_CODES.
  machineExitContract: {
    PASS: EXIT_CODES.PASS,
    FAIL: EXIT_CODES.FAIL,
    BLOCKED: EXIT_CODES.BLOCKED,
    note:
      "BLOCKED is a distinct non-zero code, never collapsed into PASS. A previous revision set a non-zero exit code only for FAIL, so a BLOCKED final-closure gate exited 0 and appeared green to any caller that checks exit status.",
    invalidStatusHandling: "An unrecognized executionStatus throws rather than defaulting to 0."
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

  // The honest, machine-readable statement of what A15 V1 can and cannot
  // currently produce. These two facts are deliberately separated because
  // conflating them is what produced the earlier false claim that "A15 V1 is
  // capable of PASS".
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
      "The absence of canonical definitions/evidence is real governance information and must be reported as such, never engineered away.",
    independentReviewIsSeparate:
      "independentReview is NOT in itemsThatCannotCurrentlyProducePass: its check method has a real PASS branch, and it currently returns FAIL only because the controlling ledger row genuinely records UNSATISFIED. That is an evaluated-world gap, not a contract capability gap, and it closes by the review actually happening — not by revising this contract."
  },

  phase10AClosure: {
    autoClose: false,
    statement:
      "An A15 PASS execution status, and/or an ACCEPTED_FOR_A15_CLOSURE review disposition, does not by itself change Phase 10A from OPEN. A separate, explicitly owner-authorized Phase 10A closure action is needed afterward, and A15 does not authorize Phase 10B."
  },

  gitPublication: {
    stageCommitPushAuthorizedByThisContract: false,
    status: "NOT_APPLICABLE_THIS_UNIT_IS_AUTHORING_ONLY"
  },

  rollback:
    "This contract and its runner are read-only with respect to all evidence, runtime, and source inputs. No rollback procedure is needed for evaluation runs. If an interrupted output-mode invocation leaves a partial results directory, preserve diagnostics and remove only that directory under separately authorized cleanup."
});

export function loadContract() {
  return CONTRACT;
}

// ── Evidence readers ────────────────────────────────────────────────────────

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

// ── Gate-state ledger parsing ───────────────────────────────────────────────
//
// A previous revision used one unanchored regular expression per lookup:
//   /\|\s*<label>\s*\|\s*`([^`]+)`/i
// That is fail-open in several distinct ways. It is case-insensitive, so
// distinct labels collide. It is unanchored inside the value cell, so it
// harvests the FIRST backtick pair anywhere after the label — for the real row
//   | E2 overall | not `PUBLISHED`/`CLOSED` — those terms are not contract-supported |
// it returns "PUBLISHED", the exact opposite of what the ledger says. It has no
// concept of table structure, cell count, duplicate rows, or which of several
// divergent historical rows is controlling, and a missing row is
// indistinguishable from a malformed one. The parser below is structural, exact,
// and fails closed.

const SEPARATOR_CELL = /^:?-{3,}:?$/;
const VALUE_CELL = /^`([^`]+)`\s*([\s\S]*)$/;

function splitRowCells(line) {
  const trimmed = line.trim();
  // Drop the leading and trailing pipe, then split. Cells are not allowed to
  // contain an escaped pipe anywhere in this ledger, and none do.
  const inner = trimmed.slice(1, trimmed.endsWith("|") ? -1 : undefined);
  return inner.split("|").map((c) => c.trim());
}

/**
 * Parse every gate-state data row out of a markdown document.
 *
 * A table is a maximal run of consecutive lines that begin with "|". Within a
 * table, a separator row (all cells matching ---) marks the preceding line as a
 * header; header and separator rows are never returned as data. Rows are tagged
 * with their table index so duplicate-label ambiguity can be judged per table.
 * Malformed rows ARE returned, flagged, so a caller can fail closed on them
 * instead of skipping silently to an older row.
 */
export function parseLedgerTable(text) {
  const lines = String(text).split("\n");
  const rows = [];
  let tableIndex = -1;
  let inTable = false;
  let headerLine = -1;

  const isPipeLine = (l) => l.trim().startsWith("|");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!isPipeLine(line)) {
      inTable = false;
      continue;
    }
    if (!inTable) {
      inTable = true;
      tableIndex += 1;
      headerLine = -1;
      // A separator on the very next line makes this line a header row.
      if (i + 1 < lines.length && isPipeLine(lines[i + 1])) {
        const nextCells = splitRowCells(lines[i + 1]);
        if (nextCells.length > 0 && nextCells.every((c) => SEPARATOR_CELL.test(c))) headerLine = i;
      }
    }
    const cells = splitRowCells(line);
    if (cells.length > 0 && cells.every((c) => SEPARATOR_CELL.test(c))) continue;
    if (i === headerLine) continue;

    const label = cells.length > 0 ? cells[0] : "";
    const valueCell = cells.length > 1 ? cells[1] : "";
    const valueMatch = cells.length === 2 ? VALUE_CELL.exec(valueCell) : null;
    rows.push({
      tableIndex,
      lineNumber: i + 1,
      raw: line,
      cellCount: cells.length,
      label,
      valueCell,
      malformed: valueMatch === null,
      token: valueMatch ? valueMatch[1] : null,
      annotation: valueMatch ? valueMatch[2].trim() : null
    });
  }
  return rows;
}

/**
 * Select the controlling gate-state row for `label`.
 *
 * Label matching is EXACT and case-sensitive: the hyphenated
 * "Deterministic clean-staging closure" and the slashed
 * "Deterministic clean/staging closure" are different rows with different
 * recorded dispositions, and must never be conflated.
 *
 * Returns { status, token, annotation, occurrences, selectionRule, detail }
 * with status one of FOUND | NOT_FOUND | MALFORMED | AMBIGUOUS.
 */
export function selectLedgerRow(text, label) {
  const matches = parseLedgerTable(text).filter((r) => r.label === label);
  const occurrences = matches.map((r) => ({
    tableIndex: r.tableIndex,
    lineNumber: r.lineNumber,
    token: r.token,
    valueCell: r.valueCell,
    malformed: r.malformed
  }));
  const base = {
    label,
    token: null,
    annotation: null,
    occurrences,
    selectionRule: LEDGER_ROW_SELECTION_RULE.rule
  };

  if (matches.length === 0) {
    return { ...base, status: "NOT_FOUND", detail: `no gate-state row found for label '${label}'` };
  }

  const first = matches[0];
  const sameTable = matches.filter((r) => r.tableIndex === first.tableIndex);
  if (sameTable.length > 1) {
    return {
      ...base,
      status: "AMBIGUOUS",
      detail:
        `label '${label}' occurs ${sameTable.length} times inside one table ` +
        `(lines ${sameTable.map((r) => r.lineNumber).join(", ")}) with values ` +
        `${sameTable.map((r) => JSON.stringify(r.valueCell)).join(" vs ")}; ` +
        LEDGER_ROW_SELECTION_RULE.ambiguityHandling
    };
  }

  if (first.malformed) {
    return {
      ...base,
      status: "MALFORMED",
      detail:
        `controlling row for '${label}' at line ${first.lineNumber} has a value cell that is not a ` +
        `single backticked token (cellCount=${first.cellCount}): ${first.valueCell}`
    };
  }

  return {
    ...base,
    status: "FOUND",
    token: first.token,
    annotation: first.annotation,
    detail:
      `line ${first.lineNumber}: ${first.valueCell}` +
      (occurrences.length > 1
        ? ` (${occurrences.length} occurrences; newest selected by ${LEDGER_ROW_SELECTION_RULE.rule})`
        : "")
  };
}

/** Map a ledger-row selection onto an item status, fail-closed. */
function statusFromLedgerRow(selection, expectedValue, labelForDetail) {
  switch (selection.status) {
    case "NOT_FOUND":
      return { status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE, detail: selection.detail };
    case "MALFORMED":
    case "AMBIGUOUS":
      return { status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE, detail: selection.detail };
    case "FOUND":
      if (selection.token === expectedValue) {
        return { status: ITEM_STATUS.PASS, detail: `${labelForDetail} = ${selection.token}` };
      }
      return {
        status: ITEM_STATUS.FAIL,
        detail: `${labelForDetail} = ${selection.token} (expected ${expectedValue}); ${selection.detail}`
      };
    default:
      throw new Error(`unhandled ledger selection status: ${selection.status}`);
  }
}

// ── Evidence manifest verification ──────────────────────────────────────────
//
// A previous revision only checked that the manifest FILE existed and then
// reported PASS. It never parsed a line, never rehashed a byte, and never
// confirmed that the artifacts the manifest names still exist — so a manifest
// full of placeholder hashes over deleted files verified clean.

const MANIFEST_LINE = /^([0-9a-f]{64})  (.+)$/u;

/**
 * Remove one trailing CR so a CRLF checkout parses identically to an LF one.
 * The runner must not depend on .gitattributes continuing to pin `-text` on the
 * hash-bound E2 evidence tree, and JS `.` excludes CR as a line terminator, so
 * without this a CRLF manifest line reads as malformed and a CRLF review's
 * '## Verdict' heading reads as absent — both fail closed, but with a wrong
 * diagnosis. Exactly one trailing CR is dropped: a CR anywhere else still makes
 * the line malformed rather than being silently normalized away.
 */
function stripCr(line) {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

/**
 * Verify a SHA-256 evidence manifest by independently rehashing every artifact
 * it names. The manifest's own directory is the evidence root: manifests carry
 * repository-relative POSIX paths (the committed E2 convention), and every one
 * of those paths must resolve, after symlink resolution, inside that root.
 *
 * Returns { ok, entries, errors }. `ok` requires at least one entry and zero
 * errors: an empty manifest is a failure, not a vacuous success.
 */
export function verifyEvidenceManifest(root, manifestRelPath) {
  const errors = [];
  const entries = [];
  const manifestAbs = path.join(root, ...manifestRelPath.split("/"));
  assertContained(root, manifestAbs, `manifest path '${manifestRelPath}'`);
  if (!fs.existsSync(manifestAbs)) {
    return { ok: false, entries, errors: [`manifest not found: ${manifestRelPath}`] };
  }

  const evidenceRoot = path.dirname(manifestAbs);
  const text = fs.readFileSync(manifestAbs, "utf8");
  const lines = text.split("\n").map(stripCr).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { ok: false, entries, errors: ["manifest has no entries"] };
  }

  const seen = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = MANIFEST_LINE.exec(line);
    if (!match) {
      errors.push(
        `malformed manifest line ${i + 1}: expected 64 lowercase hex digits, two spaces, then a path; got ${JSON.stringify(line)}`
      );
      continue;
    }
    const expectedHash = match[1];
    const relPath = match[2];

    if (relPath.startsWith("/") || /^[A-Za-z]:[/\\]/u.test(relPath)) {
      errors.push(`manifest line ${i + 1} uses an absolute path, which is not allowed: ${relPath}`);
      continue;
    }
    if (relPath.includes("\\")) {
      errors.push(`manifest line ${i + 1} uses a backslash; manifest paths must be posix-relative: ${relPath}`);
      continue;
    }
    if (seen.has(relPath)) {
      errors.push(`manifest line ${i + 1} is a duplicate entry for ${relPath}`);
      continue;
    }
    seen.add(relPath);

    const artifactAbs = path.join(root, ...relPath.split("/"));
    if (path.resolve(artifactAbs) === path.resolve(manifestAbs)) {
      errors.push(`manifest line ${i + 1} is a self-reference; a manifest cannot hash itself: ${relPath}`);
      continue;
    }
    if (!isContained(evidenceRoot, artifactAbs)) {
      errors.push(`manifest line ${i + 1} resolves outside the evidence root ${path.basename(evidenceRoot)}: ${relPath}`);
      continue;
    }
    if (!fs.existsSync(artifactAbs)) {
      errors.push(`manifest line ${i + 1} referenced artifact does not exist: ${relPath}`);
      continue;
    }
    if (!fs.statSync(artifactAbs).isFile()) {
      errors.push(`manifest line ${i + 1} referenced path is not a regular file: ${relPath}`);
      continue;
    }

    const actualHash = createHash("sha256").update(fs.readFileSync(artifactAbs)).digest("hex");
    const verified = actualHash === expectedHash;
    if (!verified) {
      errors.push(`manifest line ${i + 1} hash mismatch for ${relPath}: expected ${expectedHash}, computed ${actualHash}`);
    }
    entries.push({ path: relPath, expectedHash, actualHash, verified });
  }

  return { ok: errors.length === 0 && entries.length > 0, entries, errors };
}

/**
 * Read the verdict token out of an internal review's structural "## Verdict"
 * section. A whole-document substring search is not a verdict read: the
 * expected token routinely appears in surrounding prose, in a quoted
 * predecessor verdict, or in a "what would have been needed" paragraph, so a
 * document whose actual verdict is CHANGES_REQUIRED can satisfy it.
 *
 * Returns { verdict, error }. Exactly one "## Verdict" heading must exist, and
 * the first non-empty line of its section must be a single backticked token.
 */
export function extractVerdict(text) {
  const lines = String(text).split("\n").map(stripCr);
  const headingIndexes = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (/^##[ \t]+Verdict[ \t]*$/u.test(lines[i])) headingIndexes.push(i);
  }
  if (headingIndexes.length === 0) {
    return { verdict: null, error: "no '## Verdict' heading found in internal review" };
  }
  if (headingIndexes.length > 1) {
    return {
      verdict: null,
      error: `duplicate '## Verdict' headings found at lines ${headingIndexes.map((i) => i + 1).join(", ")}`
    };
  }

  const start = headingIndexes[0] + 1;
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    if (/^#{1,6}[ \t]/u.test(lines[i])) {
      end = i;
      break;
    }
  }
  for (let i = start; i < end; i += 1) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    const match = /^`([^`]+)`$/u.exec(line);
    if (!match) {
      return {
        verdict: null,
        error: `malformed verdict body at line ${i + 1}: expected a single backticked token, got ${JSON.stringify(line)}`
      };
    }
    return { verdict: match[1], error: null };
  }
  return { verdict: null, error: "'## Verdict' section is empty" };
}

// ── Preflight observation ───────────────────────────────────────────────────

/** Observed vs. contract-expected Node runtime identity. Derived, not asserted. */
export function runtimeIdentity() {
  const expected = CONTRACT.inputsAndPrerequisites.nodeRuntimeIdentity;
  const actual = { platform: process.platform, architecture: process.arch };
  return {
    expected,
    actual,
    pass: actual.platform === expected.expectedPlatform && actual.architecture === expected.expectedArchitecture
  };
}

/**
 * Read the git branch and commit for `root` using ONLY filesystem reads: the
 * `.git` entry (directory or linked-worktree pointer file), HEAD, `commondir`,
 * loose refs, and `packed-refs`. No subprocess is spawned and no network is
 * touched, so this stays inside the contract's network-disabled posture.
 *
 * Never throws: an unreadable or non-repository root is reported as absent.
 */
export function readWorktreeHead(root) {
  const absent = (detail) => ({ present: false, branch: null, commit: null, detail });
  try {
    const dotGit = path.join(root, ".git");
    if (!fs.existsSync(dotGit)) return absent("no .git entry at root");

    let gitDir;
    if (fs.statSync(dotGit).isDirectory()) {
      gitDir = dotGit;
    } else {
      const pointer = /^gitdir:[ \t]*(.+?)[ \t]*$/mu.exec(fs.readFileSync(dotGit, "utf8"));
      if (!pointer) return absent(".git file carries no gitdir pointer");
      gitDir = path.resolve(root, pointer[1]);
    }

    const headPath = path.join(gitDir, "HEAD");
    if (!fs.existsSync(headPath)) return absent(`HEAD not found under ${gitDir}`);
    const head = fs.readFileSync(headPath, "utf8").trim();

    if (/^[0-9a-f]{40}$/u.test(head)) {
      return { present: true, branch: null, commit: head, detail: "detached HEAD" };
    }
    const refMatch = /^ref:[ \t]*(.+)$/u.exec(head);
    if (!refMatch) return absent(`unrecognized HEAD contents: ${JSON.stringify(head)}`);
    const ref = refMatch[1].trim();
    const branch = ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : null;

    let commonDir = gitDir;
    const commonPath = path.join(gitDir, "commondir");
    if (fs.existsSync(commonPath)) commonDir = path.resolve(gitDir, fs.readFileSync(commonPath, "utf8").trim());

    for (const base of [gitDir, commonDir]) {
      const loose = path.join(base, ...ref.split("/"));
      if (fs.existsSync(loose) && fs.statSync(loose).isFile()) {
        const value = fs.readFileSync(loose, "utf8").trim();
        if (/^[0-9a-f]{40}$/u.test(value)) {
          return { present: true, branch, commit: value, detail: "resolved from loose ref" };
        }
      }
    }

    const packed = path.join(commonDir, "packed-refs");
    if (fs.existsSync(packed)) {
      for (const line of fs.readFileSync(packed, "utf8").split("\n")) {
        const entry = /^([0-9a-f]{40})[ \t]+(.+?)[ \t]*$/u.exec(line);
        if (entry && entry[2] === ref) {
          return { present: true, branch, commit: entry[1], detail: "resolved from packed-refs" };
        }
      }
    }
    return { ...absent(`ref not resolvable: ${ref}`), branch };
  } catch (err) {
    return absent(`head unreadable: ${err.message}`);
  }
}

// ── Evaluation ──────────────────────────────────────────────────────────────

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
      // No defaults for the row label or expected value: a check whose target
      // row is not configured must fail closed, not silently fall back to a
      // hard-coded label that happens to be right today.
      const { present, text } = readTextUnderRoot(root, check.evidenceSource || LEDGER_PATH);
      if (!present) {
        return { status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE, detail: `${LEDGER_PATH} not found` };
      }
      const mapped = statusFromLedgerRow(
        selectLedgerRow(text, check.ledgerRowLabel),
        check.expectedValue,
        check.ledgerRowLabel
      );
      // A precondition that is evidenced as not-yet-met is a PRECONDITION
      // block, not a criterion failure: the underlying work has not happened.
      if (mapped.status === ITEM_STATUS.FAIL) {
        return { status: ITEM_STATUS.BLOCKED_PRECONDITION, detail: mapped.detail };
      }
      return mapped;
    }

    case "LEDGER_ROW_EQUALS": {
      const { present, text } = readTextUnderRoot(root, check.evidenceSource || LEDGER_PATH);
      if (!present) {
        return { status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE, detail: `${check.evidenceSource || LEDGER_PATH} not found` };
      }
      // Evidence located and legible but not satisfied is a FAIL, not missing
      // evidence: the criterion is genuinely unmet, and reporting it as
      // "missing evidence" would understate a real, recorded gap.
      return statusFromLedgerRow(
        selectLedgerRow(text, check.ledgerRowLabel),
        check.expectedValue,
        check.ledgerRowLabel
      );
    }

    case "READ_MANIFEST_AND_VERDICT": {
      const manifest = readTextUnderRoot(root, check.evidenceSource);
      const review = readTextUnderRoot(root, check.internalReviewSource);
      if (!manifest.present || !review.present) {
        return {
          status: ITEM_STATUS.BLOCKED_MISSING_EVIDENCE,
          detail: `manifest present=${manifest.present}, internal review present=${review.present}`
        };
      }

      const verification = verifyEvidenceManifest(root, check.evidenceSource);
      if (!verification.ok) {
        return {
          status: ITEM_STATUS.FAIL,
          detail: `evidence manifest failed verification: ${verification.errors.join("; ")}`
        };
      }

      const { verdict, error } = extractVerdict(review.text);
      if (verdict === null) {
        return { status: ITEM_STATUS.FAIL, detail: `internal review verdict unreadable: ${error}` };
      }
      if (verdict !== check.expectedVerdict) {
        return {
          status: ITEM_STATUS.FAIL,
          detail: `internal review verdict is '${verdict}', expected '${check.expectedVerdict}'`
        };
      }
      return {
        status: ITEM_STATUS.PASS,
        detail: `verdict '${verdict}' confirmed; ${verification.entries.length} manifest entr${
          verification.entries.length === 1 ? "y" : "ies"
        } rehashed and matched`
      };
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
  // An empty relevant set previously fell through every branch and returned
  // PASS. A gate that evaluated nothing must never report success.
  if (relevant.length === 0) {
    throw new Error(
      "internal contract error: no relevant items to aggregate; refusing to report a vacuous PASS over an empty item set"
    );
  }
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
  // one determines overall precedence.
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
    preflight: {
      // Recorded provenance, deliberately not an equality precondition. See
      // CONTRACT.inputsAndPrerequisites.authoringBaseHead.
      authoringBaseHead: CONTRACT.inputsAndPrerequisites.authoringBaseHead.commit,
      observedHead: readWorktreeHead(root),
      runtimeIdentity: runtimeIdentity()
    },
    itemResults
  };
}

// ── Output boundary ─────────────────────────────────────────────────────────

/**
 * The controlling write defense: the output directory must be the allowlisted
 * directory or a descendant of it, decided structurally after symlink
 * resolution. Textual-prefix siblings (…-EVIL), `..` traversal, absolute
 * outside paths, and symlink/junction aliases are all rejected.
 *
 * `baseDir` is the repository root the allowlist is resolved against, so the
 * boundary is a property of the evaluated root rather than of whatever
 * directory the process happens to have been started in.
 */
export function assertWritePathAllowed(outDir, baseDir = DEFAULT_ROOT) {
  const allowedBase = path.resolve(baseDir, ALLOWED_OUTPUT_PARENT);
  if (!isContained(allowedBase, path.resolve(outDir))) {
    throw new Error(
      `refusing to write outside the allowlisted output directory tree (${ALLOWED_OUTPUT_PARENT}): ${outDir}`
    );
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const BOOLEAN_FLAGS = Object.freeze(["verify-only"]);
const STRING_FLAGS = Object.freeze(["root", "out"]);

/**
 * Parse the command line under an explicit grammar: `--flag`, `--flag=value`,
 * and `--flag value`. A previous revision treated any non-`--` token as a
 * value and any flag as truthy, so `--verify-only false` set verify-only to
 * the string "false", which is truthy — the exact inverse of the request.
 * Boolean flags accept only `true` or `false`; unknown flags, duplicated
 * flags, bare positional arguments, and string flags without a value throw.
 */
export function parseArgs(argv) {
  const parsed = { root: undefined, out: undefined, "verify-only": false };
  const seen = new Set();

  const assign = (key, rawValue, hadExplicitValue) => {
    if (!BOOLEAN_FLAGS.includes(key) && !STRING_FLAGS.includes(key)) {
      throw new Error(`unknown flag --${key}; recognized flags: ${[...STRING_FLAGS, ...BOOLEAN_FLAGS].map((f) => `--${f}`).join(", ")}`);
    }
    if (seen.has(key)) throw new Error(`flag --${key} was given more than once`);
    seen.add(key);

    if (BOOLEAN_FLAGS.includes(key)) {
      if (!hadExplicitValue) {
        parsed[key] = true;
        return;
      }
      if (rawValue !== "true" && rawValue !== "false") {
        throw new Error(`--${key} accepts only 'true' or 'false'; got ${JSON.stringify(rawValue)}`);
      }
      parsed[key] = rawValue === "true";
      return;
    }
    if (!hadExplicitValue) throw new Error(`--${key} needs a value`);
    parsed[key] = rawValue;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = String(argv[i]);
    if (!token.startsWith("--")) {
      throw new Error(`unexpected positional argument ${JSON.stringify(token)}; all inputs must be --flags`);
    }
    const body = token.slice(2);
    const eq = body.indexOf("=");
    if (eq !== -1) {
      assign(body.slice(0, eq), body.slice(eq + 1), true);
      continue;
    }
    const next = i + 1 < argv.length ? String(argv[i + 1]) : undefined;
    if (next !== undefined && !next.startsWith("--")) {
      assign(body, next, true);
      i += 1;
      continue;
    }
    assign(body, undefined, false);
  }
  return parsed;
}

/**
 * `deps` is a narrow, documented test seam only:
 *   evaluateFn — drive the exit-code mapping for statuses the current check
 *                catalogue cannot reach (see CONTRACT.passReachability). It
 *                substitutes an aggregated STATUS, never evidence.
 *   runtime    — supply an observed runtime identity, so the output-mode
 *                refusal can be exercised on a conforming machine.
 *   readHead   — supply an observed worktree head, same reason.
 *   write      — capture stdout.
 * Defaults are the real implementations, so a normal invocation has no seam.
 */
export function main(argv, deps = {}) {
  const args = parseArgs(argv);
  const write = deps.write || ((text) => process.stdout.write(text));
  const evaluateFn = deps.evaluateFn || evaluate;
  const runtimeFn = deps.runtime ? () => deps.runtime : runtimeIdentity;
  const headFn = deps.readHead || readWorktreeHead;

  const root = args.root !== undefined ? path.resolve(String(args.root)) : DEFAULT_ROOT;
  const outputMode = args.out !== undefined;
  const mode = outputMode ? "OUTPUT" : args["verify-only"] ? "VERIFY_ONLY" : "REPORT_ONLY";

  if (outputMode) {
    // Enforced preconditions for producing governed evidence. Read-only modes
    // deliberately do not refuse; they record the same observations instead.
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

    // Non-overwrite is enforced three ways: refuse a pre-existing directory,
    // create it non-recursively so a missing parent is an error rather than a
    // silently materialized tree, and write every artifact exclusively.
    if (fs.existsSync(outDir)) {
      throw new Error(`refusing to overwrite existing A15 evidence directory: ${outDir}`);
    }
    const parent = path.dirname(outDir);
    if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
      throw new Error(`output parent directory is missing; refusing to create it recursively: ${parent}`);
    }
    fs.mkdirSync(outDir, { recursive: false });

    // Execution-time hash-pinned contract snapshot: the exact embedded
    // CONTRACT this run used, copied verbatim into the evidence directory.
    // This file is never pre-committed beside the runner; it only ever exists
    // as a generated per-run artifact, matching the committed E2 convention.
    const contractBytes = Buffer.from(JSON.stringify(CONTRACT, null, 2) + "\n", "utf8");

    // The bytes written ARE the bytes hashed. A previous revision wrote
    // pretty-printed JSON with a trailing newline but hashed a second, compact
    // serialization with no newline, so no manifest entry ever matched the
    // artifact it named.
    const artifacts = [
      { name: "A15_EXECUTION_RESULT.json", bytes: resultBytes },
      { name: "A15_EXECUTION_CONTRACT.json", bytes: contractBytes }
    ];
    for (const artifact of artifacts) {
      fs.writeFileSync(path.join(outDir, artifact.name), artifact.bytes, { flag: "wx" });
    }

    // Repository-relative POSIX paths, sorted, manifest excluded from itself —
    // the committed E2 manifest convention, so the same verifier reads both.
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
    fs.writeFileSync(path.join(outDir, "A15_EVIDENCE_MANIFEST.sha256"), Buffer.from(manifestBody, "utf8"), {
      flag: "wx"
    });
  }

  write(resultBytes.toString("utf8"));
  process.exitCode = exitCodeFor(result.executionStatus);
  return result;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main(process.argv.slice(2));
}
