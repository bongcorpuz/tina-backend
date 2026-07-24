# FROZEN PLAN — PHASE-10A14-R20

> This plan becomes **IMMUTABLE** upon COMMIT 1. No field below may be altered after COMMIT 1 is committed and pushed. Any required change is a new remediation, not an edit to this frozen plan.

## Exact task title

`PHASE-10A14-R20-CLAUSE-LEVEL-TAX-INTENT-OBJECT-RELATION-AND-COMPLETE-GOVERNED-ATTEMPT-REGISTRY-CLOSURE-REMEDIATION-1`

- Repository: `C:\Projects\tina-backend`
- Branch: `feature/source-availability-engine-v1`
- Mandatory starting HEAD: `f0efc377a77de0b7f69913c4977333d1fb5fff8d`
- Controlling independent-review commit: `f0efc377a77de0b7f69913c4977333d1fb5fff8d`
- R19 final runtime: `b3e879b18e7c9781eabade32622468066fbcde27`
- Runtime model: `gpt-4o-mini`
- Inherited decision: **REVISIONS REQUIRED**

## Controlling findings (R19 Independent Review 1)

| Finding | Class | Nature |
|---|---|---|
| P1-IR19-001 | P1 | Clause-level tax-intent / object relation not modeled |
| P1-IR19-002 | P1 | Material false allows on mixed-domain and ordinary-object queries |
| P1-IR19-003 | P1 | Material false refusals on genuine tax questions about ordinary objects |
| P1-IR19-004 | P1 | Governed attempt registry incomplete / not closure-complete |
| P1-IR19-005 | P1 | Reason codes rely on generic `strong_tax_signal` rather than relation-grounded codes |
| P2-IR19-006 | P2 | Capitalization / acronym-expansion handling gaps |

The exact five P1 findings and one P2 finding are the controlling remediation targets. Their precise text is preserved in `evaluation/results/phase-10a14-r19-independent-review-1.json` (blob `a8526c4325ab67c694ad8c129b3a842567947421`).

## Accepted closures (regression-only)

All prior accepted controls (R15 historical governance NOT SUPERSEDED; corrected semantic R18 567; R15–R19 accepted controls) are preserved **as regression only**. They must continue to pass. They must not be re-litigated, re-scored, or weakened. R20 adds capability; it does not subtract accepted behavior.

## Clause-level architectural directive

R20 must model tax intent at the **clause level** via an explicit object-relation model: identify the primary task clause, its verb and target, and the *relation* between tax predicates and the task target. Decisions must be grounded in a relation and a specific reason code, not in a generic strong-signal heuristic. Full schema in `CLAUSE_LEVEL_INTENT_SCHEMA.md` and precedence in `RELATION_AND_PRECEDENCE_SPEC.md`.

## Terminology boundary

- The R20 corpus is **development evidence only**. It must never be described as unseen, blind, holdout, or independent.
- The Codex 5.5 R20 Independent Review 1 is the only independent review. The executor must not perform, simulate, or pre-write it.
- "Controlling evidence" = registered, evidence-bearing invocations against the frozen runtime. "Non-controlling" = optional challenges (e.g. Gemini static challenge) and supporting diagnostics.

## Allowed scope

- Clause-level analyzer implementation in the frozen runtime allowlist (`ALLOWED_FILE_INVENTORY.json`).
- Governed attempt wrapper + registry tooling, only where pre-authorized by `ALLOWED_FILE_INVENTORY.json`.
- R20 evidence, oracle, and specification artifacts under `evaluation/results/phase-10a14-r20/` and governed evaluation paths.

## Prohibited scope

- Any file outside the frozen allowlist.
- `pipeline.js`, `server.js`, `ask-handler.js`, `answer-renderer.js`, LOA workflow, retrieval/reranking, sourceAvailability, corpus/index, frontend, database/schema.
- Model change, ingestion, reindexing, deployment.
- `C:\Projects\tina-dev-factory`, `.claude/`, `.vscode/`, `evaluation/factcheck/`.
- E2, A15, Phase 10A closure, Phases 10B/10C/10G/10H.

## Exact commit sequence

See `FREEZE_SEQUENCE.md`. COMMIT 1 = frozen plan and contract (this commit). No implementation, no oracle run, no runtime change in COMMIT 1. No runtime change before COMMIT 3. No development-oracle expectation edits after COMMIT 4. No runtime change after COMMIT 5.

## Freeze rules

- This plan and all COMMIT 1 contract artifacts freeze at COMMIT 1.
- Pre-fix evidence freezes at COMMIT 2.
- Development-oracle expectations freeze at COMMIT 4.
- Final runtime freezes at COMMIT 5.

## Retry rules

See `RETRY_RULES.md`. Max one initial attempt plus at most two valid technical retries per cycle. A real runtime defect requires a new development iteration, not a retry.

## Final decision rule

See `DECISION_AND_STOP_RULES.md`. Permitted decisions: `PASS` or `REVISIONS REQUIRED`. No conditional PASS.

## Governance statement

R20 is subject to TINA governance (governance/, Authority Lock, AGENT_RULES, RELEASE_GATES). No patch may weaken Authority Lock. Governance overrides implementation. R20 remains prospective and NOT SATISFIED until Codex 5.5 Independent Review 1 issues PASS. Phase 10A remains OPEN.

## Stop condition

After COMMIT 1 is committed, pushed, synchronized, and verified, **STOP**. Do not begin COMMIT 2 in the same run.
