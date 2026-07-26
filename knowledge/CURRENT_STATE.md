# CURRENT_STATE.md

## TINA Controlling Continuity Status

Last updated:

`2026-07-25T12:30:00Z`

Repository:

`C:/Projects/tina-backend`

Branch:

`feature/source-availability-engine-v1`

## Current Controlling Phase

```text
PHASE 10 — V1 RELEASE GATES
PHASE 10A — TRUST, LIMITATION AND AUTHORITY-CONFIDENCE CLOSURE
PHASE 10A14-R20 — ACTIVE / IN PROGRESS
```

Phase 10A is OPEN.

R20 is not PASS and is not governance-satisfied.

Phases 10B-M0 through 10E remain gated and must not begin before Phase 10A closure.

## Latest Completed Execution Unit

```text
PHASE-10A14-R20 — COMMIT 5R1-C7
DECISION-LAYER CLOSURE CONTINUATION 7 AGAINST R3
DECISION: INCOMPLETE — DECISION LAYER REMEDIATION NOT CLOSED
```

R3 remains canonical and unchanged:

```text
ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54
rows = 3,720
```

Reconstructed accepted C6 base (new governed campaign, controlling):

```text
overall  = 3,009 / 3,720
decision = 3,464 / 3,720
decision mismatches = 256
reconstruction discrepancies = 0 (exact identity match on all eight metrics)
```

Best governed C7 candidate:

```text
overall  = 3,047 / 3,720
decision = 3,623 / 3,720
```

Remaining decision mismatches:

```text
97
```

Decision confusion on the best candidate:

```text
false allows        = 37
false refusals      = 57
clarify mismatches  =  3
```

Closed decision controls — all preserved at every accepted iteration:

```text
tax_compliance_task             108 / 108
acronym_homograph_control       200 / 200
ambiguous_clarification_control 150 / 150
internal_label_proper_name      104 / 104
```

Counterfactual controls:

```text
C7 v3 suite authored before any runtime change:
  331 new deterministic queries, 197 structural pairs, 15 families
  exact R3 query leakage = 0 (guard fired 3 times during authoring; each reworded)
best candidate result = 285 / 331
```

Remaining structural clusters (97 rows, non-overlapping):

```text
CONCRETE_TARGET_TAX_RELATION_MISSED          43
CONCRETE_TARGET_FALSE_TAX_ANCHOR             22
ACRONYM_DEFINITION_INTENT                    10
ACRONYM_AS_LABEL_OR_NAME                      9
TREATMENT_PREDICATE_WITH_RESOLVED_TARGET      5
COMPLIANCE_PROCEDURE_WITH_IMPLICIT_TARGET     3
QUOTATION_SCOPE                               3
CONTEXTUAL_ACRONYM_TAX_CONTEXT_MISSED         2
```

Material iterations: 5 of 5 permitted were used. The iteration ceiling was reached
before decision lock, so no clean lock-verification attempt was allocated and none was
fabricated.

Verification gates run against the best candidate:

```text
decision-focused regression   closed controls 0 failed
decision anti-overfit         PASS (17 / 17 checks, executable code with comments stripped)
decision determinism          PASS (150 queries x 100 reps; drift 0, byte drift 0, mutation 0)
```

Principal architectural finding:

```text
The dominant ALLOW -> REFUSE defect was a substring-based global token veto. Non-tax
domain nouns were matched with raw substring containment, so "app" inside "applies" and
"car" inside "carry" suppressed genuine tax relations. Word-boundary matching removed
this. A global token veto is prohibited by the decision evidence contract, so this was a
contract violation as well as a scoring defect.
```

Layer status:

```text
decision lock:   not achieved (best decision 3,623 / 3,720)
relation lock:   not started
reason lock:     not started
standalone:      not achieved
integration:     not performed
freeze:          not performed
```

Runtime:

```text
not integrated
not frozen
runtimeMutable = true
live services restored to the committed COMMIT 3 baseline
tracked diff over services/ and tests/ = 0 bytes
```

Preserved candidate:

```text
attempt: R20-domain_campaign-r20_commit5r1c7_development_iteration_06-commit5r1c7-dev-06
snapshot: the attempt's runtime-snapshot directory
patch:    evaluation/results/phase-10a14-r20/COMMIT_5R1C7_BEST_CANDIDATE.patch
```

All rejected and superseded iterations are preserved in their own attempt directories.

## Prior Execution Unit — COMMIT 5R1-C7-P1

```text
PHASE-10A14-R20 — COMMIT 5R1-C7-P1
PREFLIGHT RUNTIME-IDENTITY RECONCILIATION,
RESIDUE RECOVERY AND ROADMAP CANONICALIZATION
DECISION: COMPLETE
```

This unit existed because the attempted COMMIT 5R1-C7 preflight correctly stopped before
runtime reconstruction, attempt allocation, oracle execution, semantic remediation or any
repository modification. It cleared the preflight ambiguity without losing evidence.

Canonical oracle:

```text
R3, unchanged
ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54
```

Runtime:

```text
committed COMMIT 3 baseline
not integrated
not frozen
runtimeMutable = true
```

Analyzer identity:

```text
classification: CRLF_WORKTREE_NORMALIZATION_ONLY
```

The earlier stop compared a raw working-tree SHA-256 against a Git blob SHA-1. Those are
different hash functions over different byte streams and can never be equal. Under
`core.autocrlf=true` the working tree holds CRLF while the blob holds LF. No drift existed
and no restoration was required or performed.

```text
raw working-tree SHA-256:   0f67e16e4377aac9e46287ca59e90825926949fe19bea2eea56c408662702484
Git blob (SHA-1):           a23364bc6a31196d2fb5d9f1299ab069d84b5ca1
normalized-LF identity:     8c984f17a83e94b7e4eed5401070b3b40097ac5bcb914caf53f1d33f0ea6b308
                            (working tree, blob content and raw blob all equal)
byte-length delta:          697, exactly the CRLF pair count
index flag:                 H (no assume-unchanged, no skip-worktree)
attributes/filters:         none applying to the path
module load / exports:      PASS, all nine required exports present
```

Identity policy adopted for C7: the Git blob SHA-1 remains the canonical committed identity,
and content identity is asserted on normalized-LF SHA-256 wherever `core.autocrlf=true` applies.

Root residue:

```text
4 files inventoried (tmp_full.mjs, tmp_probe.mjs, tmp_r3.mjs, tmp_r3fails.json)
0 duplicate of committed evidence
4 uniquely recovered and preserved with sidecar metadata
0 remaining at repository root
0 sensitive findings
```

All four were C6-era ad-hoc diagnostic scratch files. Exact bytes were copied to
`evaluation/results/phase-10a14-r20/commit5r1c7p1-recovered-residue/root-files/` and destination
hashes verified equal to source before removal. They are marked non-controlling and must not be
executed. The single secret-scan regex hit was the literal word "tokens" inside the synthetic
non-tax benchmark query `board game pricing tokens mechanic` (oracleId `R20N-ENT-0556`), not a
credential.

Roadmap:

```text
knowledge/TINA_Updated_Roadmap_v7.md
tracked
SHA-256: 235cc3366b018b74fa252d8c5f7546b5ed3abd4b43b2be3a0a9e1cbf8cfb6daa
Phase 10A absolute blocker preserved
18 major phases preserved
```

The roadmap was read in full before any classification or write. Its stated C6 results match the
committed evidence. It is strategic governance only: not a legal authority, not a runtime oracle,
not a test-expectation source, and not authorization to bypass Phase 10A, ingest or promote
sources, deploy or commercialize.

Git parent chain:

```text
23df8e8aa098bd4518fbbccbebfd50c3ee14b7da -> 1a8abdd098a5bc93ce0371a0ed0b056f712501cd
```

The prior C7 prompt stated a mandatory parent of `08990106993262cc5fdb4ad8b77b17aa3cf479dd`.
That was a prompt defect, not a repository defect; `08990106` is the parent of C5.

Registry:

```text
prior attempts:          55 (all preserved and unchanged)
new C7-P1 attempts:       2 (both synthetic_validator, controlling)
total attempts:          57
domain campaigns:         0 registered in this unit
oracle executed:          false
cumulativeThrough = commit5r1c7p1
runtimeClosure = false
decisionLayerClosure = false
closureComplete = true
orphan = 0
dangling = 0
```

R20 remains IN PROGRESS.
Phase 10A remains OPEN.
The preflight reconciliation is not decision closure and is not R20 PASS.

## Prior Execution Unit

```text
PHASE-10A14-R20 — COMMIT 5R1-C6
DECISION-LAYER CLOSURE CONTINUATION 6 AGAINST R3
DECISION: INCOMPLETE — DECISION LAYER REMEDIATION NOT CLOSED
```

Canonical oracle:

```text
R3, unchanged
ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54
```

Reconstructed accepted C5 candidate:

`2,959 / 3,720` overall (decision 3,415 / 3,720)

Best governed C6 decision candidate:

`3,464 / 3,720` decisions (overall 3,009 / 3,720)

Remaining decision mismatches:

`256`

Layer status:

```text
decision lock:   not achieved (best decision 3,464/3,720)
relation lock:   not started
reason lock:     not started
standalone:      not achieved
integration:     not performed
freeze:          not performed
```

Best accepted candidate (dev-02) mismatch matrix:

```text
overall passed:            3,009 / 3,720
decision mismatches:       256
relation mismatches:       209  (side effect; not remediated in C6)
reason mismatches:         710  (side effect; not remediated in C6)
material false allows:      72
material false refusals:   143
clarify mismatches:         41
metamorphic groups passed:  72 / 100
```

Decision controls closed by the accepted candidate:

```text
tax_compliance_task decisions:          108 / 108
acronym_homograph_control decisions:    200 / 200
ambiguous_clarification_control:        150 / 150 decision-correct
internal_label_proper_name:             104 / 104 decision-correct
counterfactual controls (combined):     369 / 400  (existing 189/200, extension 180/200)
```

Note: the combined counterfactual suite is 369/400 on the accepted candidate
(improved from the reconstructed base's 322/400); the 400/400 target belongs to the
final decision-locked candidate, which was not reached.

Runtime:

```text
not integrated
not frozen
runtimeMutable = true
live services restored to the committed baseline
```

Agent availability:

```text
Gemini 2.5 Pro: unavailable in this environment (not fabricated)
substitute non-controlling challenger: Sonnet 5 (recorded, advisory only)
controlling decision issued by: Opus 4.8 (primary executor)
```

Atomic-write safety:

```text
in-repo atomic source-write protocol used (no scratchpad Temp write-back);
guard passed before/after every evidence-bearing execution; no zero-byte
or truncation incident; live runtime equals the committed baseline after restore.
```

C6 accepted decision-lane change (two coherent steps):

```text
1. priority-1 clusters — quotation-scope guard (a text operation on a quoted
   tax term -> QUOTES_TERM/REFUSE), non-tax-domain-noun expansion (text box,
   CSS class, private lease/contract, computer file, function), extended
   label-binding (named/keep/store + report filename) with a bare-acronym-label
   carve-out;
2. Context-N contentless referent (a bare compliance/treatment attribute with a
   trailing "Context N" tag and no concrete object -> no_tax_relation/REFUSE).
Decisions 3,415 -> 3,464; all closed controls preserved; false-refusals held 143.
```

Remaining decision clusters (for C7):

```text
- ALLOW->REFUSE concrete-tax anchoring (104; heterogeneous "other" tail);
- CONTEXTUAL_ACRONYM_MISCLASSIFIED (102);
- residual decision tail;
these carry documented false-allow versus false-refusal trade risk.
```

Preserved candidates and controls:

```text
reconstructed accepted 2,959 (dev-01):
  attempt: R20-domain_campaign-r20_commit5r1c6_reconstructed_2959_candidate-commit5r1c6-dev-01
accepted best decision candidate 3,464 / overall 3,009 (dev-02):
  attempt: R20-domain_campaign-r20_commit5r1c6_development_iteration_02-commit5r1c6-dev-02
C6 decision confusion matrix (diagonal 3,415) + updated 11-cluster partition preserved;
combined 400-query / 200-pair / 10-family counterfactual controls (369/400 on candidate);
runtime snapshots + patches preserved in the attempt directories (not applied to services/)
```

The accepted candidate is not a Decision Layer Lock and is not a PASS.

## Why COMMIT 4R3 Was Required

COMMIT 5R1-C1 proved that canonical R2 contained:

```text
14 conflicting query templates
140 affected rows
10 siblings per template
9/1 reason-family split per template
14 irreducible deterministic failures
R2 deterministic ceiling: 3,706 / 3,720
```

The conflict affected frozen reason-family expectations only.

Queries, canonical decisions, expected relations, coverage classes and row order were not changed.

R2 was preserved as immutable historical evidence.

## Canonical Oracle Chain

### V1

```text
path:
evaluation/oracles/phase-10a14-r20/R20_DEVELOPMENT_ORACLE_FROZEN.json

SHA-256:
0227a5b4b6c2eb552427e002b6a66d50b39a06635c84f74798de81ffa608b263

status:
IMMUTABLE HISTORICAL DEVELOPMENT EVIDENCE
```

### R1

```text
path:
evaluation/oracles/phase-10a14-r20/revisions/reason-family-r1/
R20_DEVELOPMENT_ORACLE_FROZEN_R1.json

SHA-256:
ba0163932fc64d59070d8bba93a23645d03598abb07d612cea25607684503f1f

status:
IMMUTABLE HISTORICAL DEVELOPMENT EVIDENCE
```

### R2

```text
path:
evaluation/oracles/phase-10a14-r20/revisions/reason-family-r2/
R20_DEVELOPMENT_ORACLE_FROZEN_R2.json

SHA-256:
1347a918ee643723531438bfe6d305756c6a43feffbe042ac1ddb2c6bf6c8ccd

status:
IMMUTABLE HISTORICAL DEVELOPMENT EVIDENCE
SUPERSEDED FOR FUTURE DEVELOPMENT SCORING BY R3
```

### R3 — Current Canonical Development Oracle

```text
path:
evaluation/oracles/phase-10a14-r20/revisions/reason-family-r3/
R20_DEVELOPMENT_ORACLE_FROZEN_R3.json

SHA-256:
ddf5a603b84e67b3a6854232e8e36c24e6f5badd531daf2e55f031e480db6a54

rows:
3,720

template conflicts resolved:
14 / 14

affected rows reviewed:
140 / 140

rows changed from R2:
102

query changes:
0

decision changes:
0

expected-relation changes:
0

row-order changes:
0

unaffected-row changes:
0

remaining template conflicts:
0

status:
FROZEN CANONICAL DEVELOPMENT EVIDENCE FOR R20 RUNTIME REMEDIATION
NOT INDEPENDENT
NOT UNSEEN
NOT A HOLDOUT
```

## Runtime State

The live runtime remains the committed COMMIT 3 baseline:

```text
services/philippine-tax-intent-analyzer.js
Git blob:
a23364bc6a31196d2fb5d9f1299ab069d84b5ca1

services/philippine-tax-domain-boundary.js
Git blob:
97986ed7c9a05f74db44b60c8766f9ab45b96a7d

services/philippine-tax-boundary-patterns.js
Git blob:
d98e63992bfa7d4b21acea7bb03fa62ffbf9827a
```

Current runtime status:

```text
standalone analyzer scaffold only
not integrated into production boundary
runtimeMutable = true
runtime freeze = NOT ACHIEVED
production integration = NOT PERFORMED
model = gpt-4o-mini
```

## Preserved Runtime-Remediation Evidence

```text
R2 baseline (historical):
1,089 / 3,720

R2 reconstructed candidate (historical):
2,674 / 3,720

R2 best COMMIT 5R1-C1 candidate (historical):
2,777 / 3,720

R3 reconstructed dev-02 (governed):
2,716 / 3,720

R3 best COMMIT 5R1-C2 candidate (governed):
2,819 / 3,720

R3 best COMMIT 5R1-C3 candidate (governed):
2,870 / 3,720

R3 best COMMIT 5R1-C4 candidate — overall (governed):
2,955 / 3,720

R3 best COMMIT 5R1-C4 result — decision layer (governed):
3,439 / 3,720

R3 best COMMIT 5R1-C5 candidate — overall (governed):
2,959 / 3,720

R3 best COMMIT 5R1-C5 result — decision layer (governed):
3,415 / 3,720

R3 best COMMIT 5R1-C6 candidate — overall (governed):
3,009 / 3,720

R3 best COMMIT 5R1-C6 result — decision layer (governed):
3,464 / 3,720
```

The R2 scores are historical only.

The best current governed R3 candidate is the accepted COMMIT 5R1-C6 dev-02 candidate at
3,009 / 3,720 overall (decision layer 3,464 / 3,720), preserved as its attempt runtime-snapshot
(with its patch from the reconstructed 2,959 base and hashes). It closed the priority-1 decision
clusters (quotation-scope, non-tax-action, label-binding) and the Context-N contentless referent,
preserving all decision controls (tax_compliance_task 108/108, acronym_homograph_control 200/200,
ambiguous_clarification_control 150/150, internal_label_proper_name 104/104) and holding
false-refusals at 143. The reconstructed accepted 2,959 base is preserved as the COMMIT 5R1-C6
dev-01 attempt.

None is applied to the live `services/` tree; the live runtime is the committed baseline.
COMMIT 5R1-C7 must resume from the accepted 3,464-decision candidate.

## Current Evidence Registry

```text
cumulativeThrough:
commit5r1c7-incomplete

runtimeClosure:
false

decisionLayerClosure:
false

total attempts:
69

by category:
domain_campaign 25 | focused_suite 5 | other 9 | synthetic_validator 30

controlling / non-controlling:
67 / 2

COMMIT 5R1-C6 new attempts:
4

COMMIT 5R1-C7-P1 new attempts:
2 (synthetic_validator, controlling; no domain campaign, no oracle execution)

COMMIT 5R1-C7 new attempts:
12 (1 reconstruction, 5 material decision iterations, 1 counterfactual suite,
    1 decision-focused regression, 1 anti-overfit, 1 determinism, 2 analysis)

closureComplete:
true

orphan results:
0

dangling attempts:
0
```

All prior attempts and failed/incomplete development states remain immutable.

## Next Exact Task

```text
PHASE-10A14-R20 — COMMIT 5R1-C8
DECISION-LAYER CLOSURE CONTINUATION 8 AGAINST R3
```

Preflight preconditions carried forward from COMMIT 5R1-C7-P1 and still holding:

```text
analyzer identity policy: Git blob canonical; normalized-LF content identity accepted
                          where core.autocrlf=true applies
working-tree drift:       none unresolved
root residue:             none
roadmap:                  tracked strategic governance
parent chain:             use the pushed C7 commit as the new starting HEAD
```

COMMIT 5R1-C8 must:

1. verify R3 and all immutable history;
2. reconstruct the best accepted C7 decision candidate (decision 3,623 / 3,720; overall 3,047 / 3,720) from its preserved attempt snapshot;
3. execute it as a new governed R3 campaign and preserve the actual result;
4. preserve all C7 analysis, the structural partition and the counterfactual v3 controls;
5. continue only the remaining decision clusters — CONCRETE_TARGET_TAX_RELATION_MISSED (43), CONCRETE_TARGET_FALSE_TAX_ANCHOR (22), ACRONYM_DEFINITION_INTENT (10), ACRONYM_AS_LABEL_OR_NAME (9) and the smaller tail — requiring a controlling tax relation over a concrete or resolved target, without reopening any closed control;
6. permit up to five new material decision iterations;
7. require exact decision 3,720 / 3,720 plus a separate clean lock-verification run before declaring a lock;
8. not begin relation or reason work, integration or freeze;
9. update CURRENT_STATE as the final substantive change;
10. commit, push and STOP.

Do not add exact-row exceptions. Do not name COMMIT 6 as the next task.

R20 remains IN PROGRESS. Phase 10A remains OPEN. Not PASS. Not SATISFIED.
Decision closure is not runtime closure. COMMIT 6 becomes the next task only after standalone
closure, integration and a successful runtime freeze in later units.

## Remaining Phase 10A Sequence

```text
COMMIT 5R1-C8 decision-layer closure (continuation)
→ COMMIT 5R1 relation-layer closure
→ reason-layer closure
→ standalone overall closure
→ integration and runtime freeze
→ COMMIT 6 post-freeze campaigns and focused evidence
→ deterministic clean cycles
→ staging clean cycles
→ R20 Independent Review 1 by Codex 5.5
→ E2
→ A15 final Phase 10A closure gate
```

Any material failure inserts another governed remediation.

Do not give a fixed remaining task count.

## Hard Constraints

```text
No V1/R1/R2/R3 expectation edit after freeze.
No runtime exact-query or oracle-ID special casing.
No model call, embeddings or network inside the boundary classifier.
No source ingestion, reindexing or corpus/vector update without separate authorization.
No production deployment before the applicable release gate.
No COMMIT 6 before runtime freeze.
No E2 or A15 before R20 independent review passes.
No Phase 10B-M0 or later phase before Phase 10A closure.
```

## Current Staging and Corpus Baseline

```text
backend service:
tina-backend-staging

environment:
staging

indexingRunning:
false

vector store:
5,346 chunks / 102 sources
```

No DB, indexing, RAG, vector, corpus or ingestion update occurred in R20.

## Phase 10 Roadmap Position

```text
10A     ACTIVE / OPEN
10A14   ACTIVE
R20     IN PROGRESS

10B-M0 through 10B-M6   NOT STARTED / GATED
10B-T                    NOT STARTED / GATED
10B                      NOT STARTED / GATED
10C                      NOT STARTED / GATED
10C-T                    NOT STARTED / GATED
10D                      FORMAL GATE NOT STARTED
10E                      FORMAL GATE NOT STARTED
```

R20 is a Philippine-tax domain-boundary classifier remediation.

R20 does not replace the future canonical terminology registry, acronym-resolution architecture, tax ontology, proposition-level grounding, legal-reliance controls or production-security gates.

## Source of Truth

Use this priority:

```text
1. committed Git evidence and frozen artifacts
2. knowledge/CURRENT_STATE.md
3. knowledge/TINA_Updated_Roadmap_v7.md
4. controlling roadmap workbook
5. conversation continuity
```

When CURRENT_STATE.md conflicts with committed evidence, committed evidence controls.

When a roadmap statement conflicts with committed execution evidence, committed evidence controls.
The roadmap is strategic governance: it is not a legal authority, not a runtime oracle, not a
test-expectation source, and not authorization to bypass Phase 10A, ingest or promote sources,
deploy or commercialize TINA.
