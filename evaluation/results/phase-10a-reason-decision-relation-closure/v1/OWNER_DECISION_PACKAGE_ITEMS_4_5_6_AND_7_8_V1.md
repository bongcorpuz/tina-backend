# PHASE-10A OWNER DECISION PACKAGE — ITEMS 4, 5, 6 (DEFINITION) AND ITEMS 7-8 (STRUCTURE)

- Classification: `PROPOSED_GOVERNING_LANGUAGE_PENDING_OWNER_APPROVAL`
- Backend canonical SHA: `0de779cd529271b9235eba3a1e4a8b051bf4c987`
- Authoring HEAD: `2956f6ceb0bc97b65151967b0f958be6dcf39a82` (second parent of the canonical merge; tree `5f0b48f161075e26d187958c0941333d93f2fc93` is byte-identical to the canonical tree)
- Canonical governance ref: `tina-dev-factory` `origin/feature/source-availability-engine-v1` = `defd33aac14592c834c25a45ca2894d3273fd0e3` (baseline `2931bc31` verified ancestor)
- Authoring unit: PHASE-10A parallel closure work, Workstream B
- Status of this document: **not governance.** It proposes language. It amends nothing.

## What this document does and does not do

This document does **not**:

- modify `knowledge/CURRENT_STATE.md`, any roadmap, or any factory governance file;
- modify, reopen, or reinterpret `PHASE-10A-A15-FINAL-CLOSURE-GATE-V1`;
- change any gate state, ledger row, or disposition;
- claim Phase 10A closed, or claim any of items 4-8 satisfied.

Every proposed condition below is traced to a committed citation. Where the
repository supplies **no** basis for a choice, this document says so and routes
it to the owner as an open decision rather than filling the gap.

---

## 0. Why items 4, 5 and 6 are BLOCKED_MISSING_DEFINITION, precisely

A15 V1 records items 4, 5 and 6 as `STATIC_BLOCKED_NO_DEFINITION`. That
assessment is confirmed by direct search. The precise nature of the gap governs
what the owner is being asked to approve.

### 0.1 The criterion phrases exist only as roadmap bullets

In `knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md`,
lines 327-337 list the eleven Phase 10A criteria under the heading `Complete:`

```text
- decision closure;
- relation closure;
- reason closure;
- standalone and integrated exact gates;
- frozen runtime;
- post-freeze evidence;
- deterministic clean cycles;
- staging clean cycles;
- independent review;
- E2; and
- A15.
```

- `standalone` and `integrated` occur in roadmap v9 at **line 330 only**.
- `frozen runtime` and `post-freeze evidence` occur in `knowledge/` only as
  these bullets, replicated in Roadmap v7 and v8.

### 0.2 Canonical factory governance is silent

A content search of `tina-dev-factory` at `defd33aa` returns **zero** files
containing `exact gate`, `frozen runtime`, `post-freeze`, `runtimeMutable`, or
`RUNTIME_HASH_LOCK`. `governance/RELEASE_GATES.md` is a consolidation bridge
deferring to `tina_harness/RELEASE_GATE.md`; both speak to production
deployment, not to Phase 10A internal closure. **The definitions must therefore
be owner-authored. They cannot be resolved by reading further.**

### 0.3 But the substance is not absent — only the pass specification is

This is the material contribution of this package. The repository contains, in
committed form:

1. an enumerated set of exact-count control gates, described in the roadmap as "all recorded exact gates";
2. a recurring structured `Layer status` block whose slots are exactly `standalone`, `integration`, `freeze`;
3. a machine-readable runtime-mutability flag with a 26-file committed history and no counter-example;
4. a fully worked operational precedent for a runtime freeze, including its manifest format;
5. a recorded post-freeze-discipline **failure**, which fixes the FAIL condition by example.

What is missing is the declared **pass condition, evidence path, and
adjudication artifact**. That is what the language below supplies.

### 0.4 A source-of-truth correction this unit is obliged to record

An earlier reading of this repository treated the section
`## Remaining Phase 10A Sequence` (`knowledge/CURRENT_STATE.md` line 4297) as
controlling. **It is not.** `knowledge/CURRENT_STATE.md` line 1460 declares:

> The later sections **"Current Evidence Registry"**, **"Next Exact Task"** (which still names COMMIT 5R1-C22) and **"Remaining Phase 10A Sequence"** are **stale historical text retained for the record**. They are superseded by this block and by checkpoint 73. Where they conflict with committed evidence or checkpoint 73, committed evidence and checkpoint 73 control.

Accordingly this package treats lines 4260-4367 (`Next Exact Task`,
`Remaining Phase 10A Sequence`, `Hard Constraints`, `Current Staging and Corpus
Baseline`, `Phase 10 Roadmap Position`, `Source of Truth`) as **historical
corroboration only**, never as controlling authority. The supersession notice is
scoped — it governs "where they conflict" — and the *ordering relation* among
standalone closure, integration, freeze and post-freeze evidence is not in
conflict with any later checkpoint; it is independently corroborated by the
non-stale `Layer status` and `Runtime State` vocabulary and by the newest
controlling blocks. The stale element is the sequence's leading step, which
still names `COMMIT 5R1-C22`; C37 and C38 are both since recorded `TERMINAL`.

The newest controlling authority is the top-of-document block set and
`## CHECKPOINT 85 — CONTROLLING STATE — POST-C37 PHASE-TRANSITION GOVERNANCE`
(line 323). Checkpoint 85 records Phase 10A open for a specific reason,
`PHASE_10A_OPEN_REASON_ORACLE_GOVERNANCE_REQUIRED`, and states that C38 is
scoped to reason-oracle/oracle-contract governance, **"explicitly excluding
runtime/candidate/registry/WAL work."** Items 5 and 6 are therefore, by the
newest controlling text, *outside* what C38 was permitted to touch — which is
exactly why they remain undefined and why they need this package.

### 0.5 The `Layer status` and `Runtime State` vocabulary

`knowledge/CURRENT_STATE.md` records a recurring structured status block at
lines 3700-3702 and again at 3874-3876:

```text
standalone:      not achieved
integration:     not performed
freeze:          not performed
```

The distinct verbs are load-bearing: `standalone` is *achieved / not achieved*
(a measurement outcome), whereas `integration` and `freeze` are *performed / not
performed* (actions). Any approved definition should preserve that distinction.

Lines 4100-4102 add:

```text
runtimeMutable = true
runtime freeze = NOT ACHIEVED
production integration = NOT PERFORMED
```

Critically, `runtimeMutable` is not merely prose. It is a **machine-readable
committed field**: `git grep -l '"runtimeMutable": true' HEAD` matches **26
tracked files**, and `git grep '"runtimeMutable": *false' HEAD` matches
**zero files repository-wide**. Item 5 therefore has a deterministic,
already-existing flag whose transition to `false` has never occurred and can be
verified mechanically.

---

## 1. ITEM 4 — `standaloneAndIntegratedExactGates`

### 1.1 Exact meaning

Two measurement regimes over the **same** exact-count gate set:

- **standalone** — the boundary/intent analyzer is scored in isolation, driven directly by the evaluation harness, with no server, no `/ask` pipeline, no retrieval and no model call. This is the regime every R20 campaign has used; `CURRENT_STATE.md` line 4098 calls the present runtime a `standalone analyzer scaffold only`.
- **integrated** — the identical gate set is re-measured through the production boundary path, with the analyzer wired into `services/philippine-tax-domain-boundary.js` and reached via the live `/ask` runtime, so the score reflects the shipped call path. Line 4099 records the present state as `not integrated into production boundary`.

"Exact gates" is not a new term of art; the repository already enumerates the set
and calls it that. Roadmap v9 line 25:

> C34 remains frozen at reason **3575/3720**, decision/relation **3720/3720**, and all recorded exact gates. The **145 reason-only rows remain** (45 explicit_non_tax_task, 16 explicit_tax_task_relation, 81 no_tax_relation, 1 tax_compliance_task, 2 tax_treatment_of_ordinary_object).

Roadmap v9 line 54 enumerates those recorded gates:

> Final controls: R3 reason **3575 / 3,720**; decision **3720 / 3,720**; relation **3720 / 3,720**; reason suite **344 / 344**; collision **196 / 196**; decision CF **756 / 756**; relation CF **282 / 282**; clause **68 / 68**; rich guard **7 / 7**; reason integrity **PASS**.

`CURRENT_STATE.md` line 4286 states the exactness requirement normatively:

> require exact decision 3,720 / 3,720, exact relation 3,720 / 3,720, exact reason 3,720 / 3,720, all suites fully passing, plus a separate clean lock-verification run, before declaring the reason lock

"Exact" therefore means **equality against the full row count, with no per-row
exception and no tolerance band**, consistent with line 4290:
`Do not add exact-row exceptions.` (Both are historical-tail citations under
section 0.4 and are offered as corroboration of meaning, not as controlling
authority; the normative force comes from the owner's approval of the language
below.)

### 1.2 One criterion with subchecks, or two criteria?

**Recommendation: ONE criterion with TWO mandatory subchecks, both of which must
independently PASS.** This matches A15 V1's existing `MULTI_SUBCHECK` modelling
and requires no change to that gate's structure. A15 V1's own line 236 comment
already reads: `// exact gates" is ONE roadmap criterion, represented as ONE
top-level item`.

Basis: the roadmap states it as a single semicolon-delimited bullet (line 330),
while `CURRENT_STATE.md` gives `standalone` and `integration` separate status
slots (lines 3700-3701). One criterion, two subchecks, reconciles both without
reinterpreting either.

Evidence must be **separate per subcheck**: the two regimes exercise different
code paths, so a standalone result is not evidence for the integrated path. This
is what `CURRENT_STATE.md` line 3358 warns against when it states that decision-
and relation-layer closure are `not runtime closure, not standalone closure, and
not R20 PASS`.

### 1.3 Proposed governing language — ITEM 4

```text
CRITERION 4 — STANDALONE AND INTEGRATED EXACT GATES

Structure
  One Phase-10A criterion evaluated by two mandatory subchecks, 4a (standalone)
  and 4b (integrated). The criterion is SATISFIED only if both subchecks are
  independently SATISFIED against separate evidence. Neither subcheck may be
  inferred from the other.

Definition of the exact gate set (identical for 4a and 4b)
  G1  decision                 = 3720 / 3720   (exact equality)
  G2  relation                 = 3720 / 3720   (exact equality)
  G3  reason                   = 3720 / 3720   (exact equality)
  G4  reason suite             =  344 /  344
  G5  collision probes         =  196 /  196
  G6  decision counterfactual  =  756 /  756
  G7  relation counterfactual  =  282 /  282
  G8  clause probes            =   68 /   68
  G9  rich-context guard       =    7 /    7
  G10 reason integrity         = PASS
  G11 anti-memorization        = PASS
  G12 closed controls          = allClosed = true

  For G2 the relation score MUST be reported as two figures, not one: the total
  (3720) and the substantively-scored subset, being rows with a non-empty
  expected-relation set (1623). Under the frozen scorer's expected-set
  containment semantics a row with an empty expectation passes vacuously, so a
  bare 3720/3720 conflates 1623 substantively-tested rows with 2097 vacuous
  passes. Reporting only the total is non-compliant.

Subcheck 4a — STANDALONE
  Meaning
    The gate set is achieved by the boundary/intent analyzer measured in
    isolation by the evaluation harness, with no server, no /ask pipeline, no
    retrieval and no model call.
  PASS
    All of G1-G12 hold in a single governed campaign attempt, AND a separate
    clean lock-verification run reproduces the same figures from the same
    verified servicesTreeDigest, AND the anti-circularity condition below holds.
  FAIL
    Any of G1-G12 not met.
  BLOCKED
    No governed attempt exists, or the attempt's servicesTreeDigest cannot be
    verified against committed bytes.

Subcheck 4b — INTEGRATED
  Meaning
    The identical gate set G1-G12 is re-achieved with the analyzer reached
    through the production boundary path, i.e. via the live /ask runtime rather
    than a harness-only path.
  PASS
    All of G1-G12 hold when measured through the integrated path, AND the
    integrated runtime identity is recorded and equals the standalone runtime
    identity for the analyzer files, so that 4a and 4b demonstrably score the
    same bytes by two different call paths.
  FAIL
    Any of G1-G12 not met through the integrated path, or the integrated and
    standalone analyzer identities differ.
  BLOCKED
    Integration has not been performed, so no integrated measurement can exist.

CRITERION 4 ANTI-CIRCULARITY
  An exact reason score of 3720/3720 does NOT satisfy G3 if it was obtained by
  revising expected values to equal the output of the runtime being scored.
  G3 requires either
    (i) that for the runtime under test the expectations were fixed before that
        runtime was measured, or
    (ii) that the score is reproduced against an unseen or holdout corpus not
        used to derive or revise any expectation.
  Rationale: this condition is required by the existing record, not invented
  here. R4 achieves 3720/3720 by setting expectedReasonCodeFamily on exactly 145
  rows equal to the sealed C37 actual values, and CURRENT_STATE.md line 282
  states of the resulting algebra: "This is analyzer-informed expectation
  governance derived from sealed C37 evidence; it is not independent, holdout,
  unseen, or blind closure evidence." Line 188 states: "R4 is analyzer-informed
  development evidence, not independent, unseen, blind, or holdout evidence."
  Without this clause, criterion 4 could be satisfied by expectation-fitting
  alone, which would make the gate self-certifying.

Required artifacts (per subcheck)
  A1  a governed campaign attempt directory with a recorded runtime identity and
      a verified servicesTreeDigest
  A2  a result artifact recording every one of G1-G12 with numerator and
      denominator, plus the split relation figures required above
  A3  per-row expected-vs-actual evidence for decision, relation and reason,
      sufficient to recompute every aggregate in A2
  A4  a separate clean lock-verification run reproducing A2
  A5  for 4b only, the integrated-path invocation record and runtime identity

Deterministic verification method
  READ_MANIFEST_AND_VERDICT over A1-A5:
    1. verify each input artifact against its recorded SHA-256, computed on
       LF-normalized bytes (see section 8 on why LF normalization is required);
    2. verify servicesTreeDigest by recomputing sha256 over the concatenated
       LF-normalized governed service files in their recorded order;
    3. recompute every aggregate in A2 from A3 and require exact agreement;
    4. require each of G1-G12 to equal its stated target;
    5. require A4 to equal A2 field for field;
    6. require the anti-circularity condition to be evidenced, not asserted.
  No network access. No mutation of services/. No writes outside the criterion's
  own results directory.

Ledger representation
  One row: "Standalone and integrated exact gates", with both subcheck states
  recorded in the same row, e.g.
  UNSATISFIED (4a UNSATISFIED; 4b BLOCKED_NOT_PERFORMED).
```

### 1.4 Present factual state of item 4, for the owner's information

Not a claim of satisfaction — a statement of where the evidence stands:

- 4a is **not achieved**. `CURRENT_STATE.md` line 3700 records `standalone: not achieved`. G3 is not met on the controlling semantic base: reason is `3575/3720`.
- Under the R4 oracle, G1, G2 and G3 all read `3720/3720`, but G3 fails the anti-circularity condition. This unit independently reproduced that finding from committed bytes: all 145 revised expectations equal the reason the semantic base emits, `145/145` (see section 5).
- 4b is **BLOCKED**: `integration: not performed` (line 3701); `production integration = NOT PERFORMED` (line 4102).

---

## 2. ITEM 5 — `frozenRuntime`

### 2.1 Exact meaning

A governed, verifiable state in which the runtime file set under evaluation is
sealed at a specific byte identity, is recorded as immutable, and cannot
thereafter be modified without an explicit governed unfreeze. Freeze is an
**action with a committed artifact**, not a description of stability.
`CURRENT_STATE.md` uses `freeze: not performed` (line 3702) and
`runtime freeze = NOT ACHIEVED` (line 4101).

### 2.2 Authoritative evidence source — an existing worked precedent

`evaluation/results/phase-10a14-e1/WS1_PREFLIGHT_AND_RUNTIME_LOCK.md`, titled
"WS1 Preflight & **Frozen Runtime Lock**", establishes in committed form exactly
what a freeze consisted of when this repository last performed one:

- a named hash-lock manifest, `RUNTIME_HASH_LOCK.sha256`, over an enumerated governed runtime file set (26 files, listed in that document: governed runtime, retrieval/reranker, prompts, and R1-R8 focused suites);
- proof that no runtime file changed since the approved ancestor: "`git diff --name-only 79be634..HEAD` = review-evidence markdown/JSON + `knowledge/CURRENT_STATE.md` only → **no runtime file changed since the reviewed R8 runtime**";
- a clean tracked worktree and `Sync: 0 0`;
- verification that the **deployed** runtime is the locked runtime, via authenticated `/debug/db-identity` returning `RENDER_GIT_COMMIT: 893820600ec2cb58c939817f0a04f8dc4afff4c3` equal to the then-HEAD;
- cross-validation of individual file hashes against a prior sealed `EVIDENCE_MANIFEST.sha256`, "confirming zero runtime drift from the reviewed R8 code";
- and an explicit ordering rule: "all WS6–WS9 matrix probes execute only after the frozen manifest is committed."

The machine-readable state flag already exists and has a clean history:
`runtimeMutable` is recorded true in 26 tracked files and false in none.
Freeze is the transition to false.

### 2.3 The FAIL condition is fixed by a recorded failure

`evaluation/results/phase-10a14-r19-independent-review-1/freeze-sequence-audit.md`
reads, in full:

> The planned final runtime at 6c43ccea was followed by runtime refinement at 5c02512c from development-oracle iteration and by b3e879b1 from executor-unseen-campaign iteration. Literal freeze discipline is therefore mixed: final evidence records b3e879b1 as final runtime, but the executor unseen campaign cannot be treated as unseen for that final runtime.

This is the precise failure mode any approved definition must exclude: runtime
changing after the nominal freeze, which retroactively destroys the unseen-ness
of campaigns run against it. Note the consequence recorded there — the remedy was
**not** to relabel the campaign, but to record that it could no longer be treated
as unseen.

### 2.4 Relationship to items 4 and 6

Freeze sits **after** item 4 and **before** item 6. It is the hinge:

- it may not be performed before standalone closure and integration (`CURRENT_STATE.md` line 4287: `not begin standalone closure, integration or freeze`; lines 4294-4295: `Decision closure is not runtime closure. COMMIT 6 becomes the next task only after standalone closure, integration and a successful runtime freeze in later units.`);
- item 6 may not begin before it (line 4324: `No COMMIT 6 before runtime freeze.`);
- it is what makes item 6 evidence meaningful, because it is what guarantees the bytes did not move underneath the post-freeze campaign;
- it terminates oracle-expectation mutability (line 4319: `No V1/R1/R2/R3 expectation edit after freeze.`).

These are historical-tail citations per section 0.4, offered as corroboration of
the ordering; the ordering is not contradicted by any later checkpoint.

### 2.5 Proposed governing language — ITEM 5

```text
CRITERION 5 — FROZEN RUNTIME

Structure
  One criterion, one check. Not divisible into subchecks.

Definition
  The runtime freeze is the governed, committed act of sealing an enumerated
  runtime file set at an exact byte identity, recording that identity in a
  hash-lock manifest, and declaring the runtime immutable for the remainder of
  Phase 10A absent an explicit governed unfreeze.

Preconditions (all mandatory; freeze is BLOCKED if any is unmet)
  P1  Criterion 4 SATISFIED, both subchecks 4a and 4b.
  P2  Tracked worktree clean.
  P3  The runtime file set to be frozen is enumerated explicitly, by path, in
      the freeze artifact. An implicit or glob-only set is non-compliant.

PASS conditions (all mandatory)
  F1  A committed RUNTIME_HASH_LOCK.sha256 exists listing every path in the
      enumerated set with its SHA-256 over LF-normalized bytes.
  F2  Recomputing each listed hash from committed git blob bytes reproduces the
      manifest exactly. Working-tree bytes are NOT authoritative: a CRLF
      checkout changes them (see section 8). Git blob bytes are.
  F3  The servicesTreeDigest of the frozen analyzer set is recorded and
      reproduces by recomputation.
  F4  runtimeMutable = false is recorded in the freeze artifact. Verification
      must confirm this is the FIRST artifact in the repository to record it
      false; today no tracked file records it false, and 26 record it true.
  F5  The freeze commit SHA is recorded in the freeze artifact.
  F6  git diff over the enumerated set between the freeze commit and HEAD is
      empty at every subsequent verification.
  F7  If a deployed runtime is in scope, the deployed build identity is verified
      equal to the freeze commit, by the same method as
      WS1_PREFLIGHT_AND_RUNTIME_LOCK.md (authenticated build-identity endpoint
      returning the deployed commit). If no deployment is in scope, the artifact
      must state that explicitly rather than omit the check.

FAIL conditions (any one is sufficient)
  X1  Any enumerated file changes after the freeze commit without a governed
      unfreeze. This is the recorded failure mode in freeze-sequence-audit.md.
      Where it occurs, affected campaigns MUST be recorded as no longer unseen;
      they may NOT be relabelled to preserve a PASS.
  X2  Any recomputed hash disagrees with the manifest.
  X3  runtimeMutable is recorded true after the freeze.
  X4  Any V1/R1/R2/R3 oracle expectation is edited after the freeze commit.
  X5  The deployed runtime identity differs from the freeze commit while a
      deployment is in scope.

BLOCKED conditions
  B1  Criterion 4 not SATISFIED. This is the present state.
  B2  Integration not performed.
  B3  No enumerated runtime file set has been approved.

Required artifacts
  A1  RUNTIME_HASH_LOCK.sha256 over the enumerated set
  A2  a freeze record recording freeze commit SHA, enumerated paths,
      servicesTreeDigest, runtimeMutable = false, the deployment-identity result
      or an explicit not-in-scope statement, and the criterion-4 evidence relied
      upon
  A3  a post-freeze drift verification, re-runnable at any later time

Deterministic verification method
  READ_MANIFEST_AND_VERDICT:
    1. read A1 and A2;
    2. for each enumerated path, extract committed blob bytes at the freeze
       commit, LF-normalize, sha256, and require equality with A1;
    3. recompute servicesTreeDigest and require equality with A2;
    4. require A2.runtimeMutable to be false;
    5. run git diff over the enumerated set from the freeze commit to HEAD and
       require it empty;
    6. require no oracle expectation file under evaluation/oracles to have
       changed after the freeze commit.
  No network access except the F7 deployment-identity probe, which is itself
  owner-authorized or explicitly declared out of scope.

Ledger representation
  One row: "Frozen runtime", states
  BLOCKED_PRECONDITION | PERFORMED_VERIFIED | FAIL_DRIFT_DETECTED.
```

---

## 3. ITEM 6 — `postFreezeEvidence`

### 3.1 Exact meaning

Evaluation evidence whose execution provably **follows** the runtime freeze and
was produced against the frozen bytes. Its purpose is to be the first evidence
in Phase 10A that cannot have influenced, or been influenced by, the runtime it
measures.

The repository names this unit: `CURRENT_STATE.md` line 4304,
`-> COMMIT 6 post-freeze campaigns and focused evidence`. The gating rule is at
line 4324: `No COMMIT 6 before runtime freeze.` The ordering precedent is
`WS1_PREFLIGHT_AND_RUNTIME_LOCK.md`: "all WS6–WS9 matrix probes execute only
after the frozen manifest is committed."

### 3.2 Why this criterion is the one that resolves items 1–3

This is the substantive link the owner should weigh when defining item 6.

Items 1 and 2 (`decisionClosure`, `relationClosure`) are recorded by A15 V1 as
`BLOCKED_MISSING_EVIDENCE` because only aggregate counts existed. This unit has
now produced the missing per-row artifact (section 5). But per-row evidence
against an **analyzer-informed** oracle is still development-governance evidence.
`CURRENT_STATE.md` line 282 states of the 3720/3720 algebra:

> This is analyzer-informed expectation governance derived from sealed C37 evidence; it is not independent, holdout, unseen, or blind closure evidence.

and line 188:

> R4 is analyzer-informed development evidence, not independent, unseen, blind, or holdout evidence.

Item 6 is the criterion under which independent evidence is actually produced.
Its definition therefore has to carry the unseen/holdout requirement, or nothing
in Phase 10A ever will.

### 3.3 Proposed governing language — ITEM 6

```text
CRITERION 6 — POST-FREEZE EVIDENCE

Structure
  One criterion, one check, evaluated over a campaign set.

Definition
  Post-freeze evidence is evaluation evidence produced by campaigns that begin
  after the criterion-5 freeze commit, execute against the frozen runtime
  identity, and are scored against expectations fixed before the frozen runtime
  was measured.

PASS conditions (all mandatory)
  E1  Every campaign in the set records a start time and a runtime identity, and
      that runtime identity equals the criterion-5 frozen servicesTreeDigest.
  E2  Every campaign execution provably follows the freeze commit, by commit
      ancestry, not by timestamp alone.
  E3  No enumerated frozen file changed at any point during the campaign set;
      criterion 5 F6 holds continuously across it.
  E4  No oracle expectation was created, revised, or reordered after the freeze
      commit. Where a campaign uses a corpus not present at freeze time, that
      corpus is declared holdout and its expectations are shown to have been
      authored without reference to the frozen runtime output.
  E5  At least one campaign in the set is unseen or holdout with respect to the
      frozen runtime, and is labelled with independent/holdout/unseen/blind
      flags whose values are true where claimed. A campaign set consisting
      solely of analyzer-informed replays does NOT satisfy this criterion.
  E6  Focused evidence is recorded per row, not only as aggregate counts, so
      that any claimed score is recomputable.

FAIL conditions (any one is sufficient)
  Y1  Any campaign runtime identity differs from the frozen digest.
  Y2  Any frozen file changed during the campaign set. Per
      freeze-sequence-audit.md this retroactively voids the unseen-ness of the
      affected campaigns; they may not be re-labelled to preserve a PASS.
  Y3  Any expectation was revised after the freeze commit.
  Y4  The campaign set contains no unseen or holdout campaign (E5 unmet).
  Y5  A campaign is labelled independent, holdout, unseen or blind while its own
      record contradicts that label.

BLOCKED conditions
  Z1  Criterion 5 not PERFORMED_VERIFIED. This is the present state.
  Z2  No campaign set has been authorized.

Required artifacts
  A1  a campaign-set index listing every campaign with start time, commit,
      runtime identity, corpus identity, and independent/holdout/unseen/blind
      flags
  A2  per-campaign per-row expected-vs-actual evidence
  A3  a continuous freeze-drift verification spanning the campaign set
  A4  an adjudication recording E1-E6 and their outcomes

Deterministic verification method
  READ_MANIFEST_AND_VERDICT:
    1. verify A1-A4 against recorded SHA-256 on LF-normalized bytes;
    2. for each campaign, require runtime identity equal to the frozen digest;
    3. require git merge-base --is-ancestor freezeCommit campaignCommit for
       every campaign;
    4. require A3 to show zero drift across the whole span;
    5. require at least one campaign with holdout or unseen true and a corpus
       identity distinct from every expectation-deriving corpus;
    6. recompute every aggregate from A2 and require exact agreement.
  No network access unless a campaign is explicitly authorized to use the
  deployed runtime, in which case the deployed identity must equal the freeze
  commit.

Ledger representation
  One row: "Post-freeze evidence", states
  BLOCKED_PRECONDITION | UNSATISFIED | SATISFIED.
```

---

## 4. ITEMS 7 AND 8 — RECOMMENDATION ONLY, NO EDIT PERFORMED

### 4.1 The question

A15 V1 evaluates `deterministicCleanCycles` (item 7) and `stagingCleanCycles`
(item 8) as two separate contract items, but both read the **same single**
ledger row, `Deterministic clean/staging closure`, expecting `SATISFIED`. Should
that single row remain, or should the ledger carry two rows?

### 4.2 What the repository shows

**The roadmap treats them as two criteria.** Roadmap v9 lines 333-334 are two
separate bullets: `- deterministic clean cycles;` and `- staging clean cycles;`.

**The ledger currently uses one combined row**, in five blocks:

```text
knowledge/CURRENT_STATE.md:45   | Deterministic clean/staging closure | UNSATISFIED (unchanged) |
knowledge/CURRENT_STATE.md:109  | Deterministic clean/staging closure | UNSATISFIED (unchanged) |
knowledge/CURRENT_STATE.md:164  | Deterministic clean/staging closure | UNSATISFIED |
knowledge/CURRENT_STATE.md:260  | Deterministic clean/staging closure | UNSATISFIED |
knowledge/CURRENT_STATE.md:302  | Deterministic clean/staging closure | NOT_CLAIMED |
```

plus one **hyphenated variant** that must never be conflated with it, since
FIRST_MATCHING_ROW_IN_DOCUMENT_ORDER selection would otherwise silently pick the
wrong row:

```text
knowledge/CURRENT_STATE.md:209  | Deterministic clean-staging closure | NOT_CLAIMED |
```

**Decisively: the tooling already separates the two lanes, by governed
decision.** `scripts/run-regressions.mjs` lines 42-46:

```text
// PHASE-10A12-R5: network-dependent staging-smoke suites are SEPARATED into a
// dedicated MANDATORY lane (scripts/run-staging-smokes.mjs, run via node scripts/run-staging-smokes.mjs)
// so a transient staging outage cannot make this DETERMINISTIC local gate flap.
// They are NOT removed or made optional — they remain a mandatory, blocking gate
// that must independently pass. This regex identifies them for exclusion + notice.
```

and `scripts/run-staging-smokes.mjs` states the conjunction explicitly:

> TINA staging-smoke gate (MANDATORY, network-dependent). … This separation does NOT remove, weaken, or make optional any staging coverage: every staging-smoke suite runs here as a MANDATORY, BLOCKING check and this script exits non-zero if any of them fails. **R5 PASS requires BOTH this lane and the deterministic gate to be green.**

Seven staging-smoke suites exist under `tests/` and are excluded from the
deterministic lane by `STAGING_SMOKE_RE` (`scripts/run-regressions.mjs:47`).

The two criteria therefore have different executables, different evidence,
different preconditions and different failure modes:

| | item 7 deterministic | item 8 staging |
|---|---|---|
| command | `node scripts/run-regressions.mjs` (`npm test`) | `node scripts/run-staging-smokes.mjs` |
| in `package.json` | yes, as `test` | no dedicated script entry |
| network | none | required |
| scope | 218 suites + 10 syntax checks | the 7 separated staging-smoke suites |
| precondition | installed dependencies, clean tree | a reachable, correctly configured staging deployment |
| can fail while the other passes | yes | yes |

### 4.3 Recommendation

**SPLIT into two ledger rows.** Recommendation only; no edit has been made.

Reasons, in order of weight:

1. **The evidence is already disjoint.** PHASE-10A12-R5 separated the lanes precisely because they are not the same check, and the staging runner states that PASS requires both lanes independently. A single row can only represent their conjunction, and it silently loses which lane failed.
2. **A single row makes A15 items 7 and 8 non-independent.** Today both read one row, so a `SATISFIED` there would mark both items satisfied from one piece of evidence, and a failure in either lane is indistinguishable. That is an aggregation A15 cannot detect and a reviewer cannot audit.
3. **The roadmap enumerates two.** Keeping one row means the ledger under-represents the controlling roadmap.
4. **The failure modes need different remediation.** A deterministic-lane failure is a code or environment defect. A staging-lane failure may be a deployment or configuration defect that no code change fixes. Collapsing them routes both to the same remediation slot.

Proposed row labels, chosen to be unambiguous under
FIRST_MATCHING_ROW_IN_DOCUMENT_ORDER and to collide with neither existing label:

```text
| Deterministic clean cycles closure | <state> |
| Staging clean cycles closure       | <state> |
```

Migration constraints the owner should impose if the split is approved:

- The split is **additive and forward-only**. The five existing `Deterministic clean/staging closure` rows and the one `Deterministic clean-staging closure` row are historical entries in an append-only newest-first document and must not be edited or deleted.
- Both new rows must be introduced in the same new ledger block, with an explicit note that they supersede the combined row **prospectively only**.
- Neither new row may be introduced in a state stronger than the combined row it supersedes. The combined row is currently `UNSATISFIED`; both new rows must therefore start at `UNSATISFIED` or weaker, never `SATISFIED`.
- **Sequencing dependency.** A15 V1 reads the combined label. Splitting the ledger row without a governed A15 successor would cause A15 items 7 and 8 to find no matching row. A15 V1 must not be edited under the present authorization, so the split must either be sequenced with an authorized A15 successor contract, or the combined row must be retained in parallel until that successor exists. **This dependency is why the split is a recommendation and not an action.**

### 4.4 If the owner prefers to keep one row

Then the row's governing language must state explicitly that it is a
**conjunction of two independently-evidenced lanes**, and the state must carry
both lane outcomes, e.g.
`UNSATISFIED (deterministic UNSATISFIED; staging UNSATISFIED)`. Otherwise the row
is not deterministically verifiable, because `SATISFIED` would not say what was
actually run.

---

## 5. WHAT THIS UNIT PRODUCED FOR ITEMS 1–3, AND ITS BEARING ON 4–6

For completeness of the owner decision context. This is evidence, not a closure
claim.

A15 V1 blocks items 1 and 2 on the ground that no separate per-row
decision-resolution manifest was located by its authoring unit. That artifact now
exists at `evaluation/results/phase-10a-reason-decision-relation-closure/v1/`,
uncommitted and classified
`CANDIDATE_EVIDENCE_PENDING_OWNER_AUTHORIZATION_AND_INDEPENDENT_REVIEW`. It holds
per-row expected-vs-actual records for decision, relation and reason across all
3,720 rows, for both the R3 baseline and the R4 candidate, produced by importing
the committed frozen scorer verbatim and executing the committed frozen
semantic-base analyzer read-only.

Two findings from it bear directly on items 4–6:

1. **The relation figure needs splitting.** Of 3,720 rows, only **1,623** carry a non-empty expected-relation set; **2,097** pass vacuously under the frozen scorer containment semantics. A bare `relation 3720/3720` overstates coverage. This is why criterion 4 G2 above requires both figures.
2. **The R4 reason score is expectation-fitted.** All 145 rows failing under R3 are exactly the 145 rows the C37 adjudication sealed, and exactly the 145 rows whose expectation changed R3→R4; in all 145 the revised expectation equals the reason the semantic base emits. Zero unauthorized field differences across all 3,720 rows; zero decision or relation expectation changes. Runtime bytes are identical between the two scoring runs. This is why criterion 4 carries an anti-circularity clause and criterion 6 carries an unseen/holdout requirement.

---

## 6. OWNER DECISIONS REQUIRED

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Adopt the criterion-4 governing language in section 1.3 | adopt / amend / reject | adopt |
| D2 | Criterion 4 structure | one criterion + two subchecks / two separate criteria | one criterion + two subchecks (matches A15 V1 `MULTI_SUBCHECK` and its own line-236 comment) |
| D3 | Adopt the criterion-4 ANTI-CIRCULARITY clause | adopt / reject | adopt; without it, expectation-fitting alone satisfies G3 |
| D4 | Adopt the criterion-5 governing language in section 2.5 | adopt / amend / reject | adopt |
| D5 | Enumerate the runtime file set to be frozen | the 3 analyzer services / the 26-file WS1 governed set / other | **owner decision; the repository supports both scopes and does not choose between them** |
| D6 | Is a deployed staging runtime in scope for criterion 5 F7 | yes / no | owner decision; if no, the freeze artifact must say so explicitly |
| D7 | Adopt the criterion-6 governing language in section 3.3 | adopt / amend / reject | adopt |
| D8 | Adopt criterion 6 E5, the mandatory unseen/holdout campaign | adopt / reject | adopt; otherwise Phase 10A closes with no independent evidence |
| D9 | Items 7–8 ledger structure | split into two rows / keep one combined row with dual-lane state | split, subject to the A15-successor sequencing constraint in 4.3 |
| D10 | Sequencing of the items 7–8 split against an A15 successor | split only with an authorized A15 successor / retain combined row in parallel | retain the combined row in parallel until an A15 successor exists |
| D11 | Whether the per-row artifact in section 5 is accepted as the items 1–2 evidence | accept as development-governance evidence / require independent re-derivation first / reject | accept as development-governance evidence only, with items 1–2 remaining short of independent closure |
| D12 | Authorize dependency installation in this worktree so the deterministic lane is reproducible | yes / no | yes; without it item 7 cannot be evidenced here at all (section 7) |

---

## 7. A BLOCKING ENVIRONMENT FINDING RELEVANT TO ITEM 7

`node_modules/` in this worktree is **empty**. `openai` is declared in
`package.json` dependencies but absent from disk.

Measured consequence: `npm test` runs 218 suites and reports **59 failed**,
against the sealed C38 baseline of **183 passed / 218** (35 failed;
`CURRENT_STATE.md` line 285 records suites 183/218 and groups 5396/5452). All
**39** newly-failing suites attribute to exactly one cause,
`Cannot find package 'openai'`, with zero unattributed. The remaining 20 failures
are a subset of the sealed baseline set.

Therefore **item 7 (deterministic clean cycles) cannot be evidenced in this
worktree at all** until dependencies are installed. This is a precondition
defect, not a regression. Installing dependencies requires network access and
would mutate the environment baseline that other units' recorded evidence depends
on; it was not authorized and was not performed. Routed to the owner as D12.

## 8. A GOVERNANCE FINDING RELEVANT TO ALL HASH-BOUND EVIDENCE

`.gitattributes` marks only the E2 runner and results paths as `-text`. The R20
oracle JSON files and the runtime snapshots are **not** protected. On a Windows
CRLF checkout their working-tree bytes therefore differ from their committed blob
bytes, and their working-tree SHA-256 does not equal the sealed value.

Measured consequence: `loadR3()` in
`evaluation/runner/phase-10a14-r20/commit5r1c13-lib.mjs` hashes the
**working-tree** file and throws `R3_ORACLE_DRIFT`, so the R20 harnesses cannot
verify oracle identity from a Windows checkout as committed.

This unit worked around it by LF-normalizing before hashing, which reproduces the
sealed values exactly, and records `crlfCheckout: true` in its artifact rather
than hiding it. Two candidate remediations, both owner decisions and neither
performed here:

1. extend `.gitattributes` to mark the oracle and snapshot paths `-text`; or
2. normalize before hashing in the harnesses, as this unit runner does.

Remediation 1 changes committed-byte checkout behaviour for other units and must
not be done casually. Remediation 2 modifies a frozen harness. Both are outside
the present authorization. This is also why criterion 5 F2 above requires
verification against **git blob bytes** rather than working-tree bytes.

---

## 9. AUTHORIZATION STATE OF THIS DOCUMENT

- Governance modified: **none**.
- `knowledge/CURRENT_STATE.md` modified: **no**.
- A15 V1 contract or runner modified: **no** (verified byte-identical to its committed blob, `f432000354b6d77bc1b6d2f35d18e3515b94b5b49d93c2c70f66181ab90a8019`, zero-byte `git diff`).
- Ledger rows edited: **none**.
- Committed or pushed: **no**.
- Phase 10A closure claimed: **no**. Phase 10A remains `OPEN`.
- Items 4, 5, 6 remain `BLOCKED_MISSING_DEFINITION` until the owner approves language.
- Items 7, 8 remain as currently recorded; the split is a recommendation only.

Reviewer outcome for this document, per the TINA reviewer vocabulary:
**TECHNICAL_INCOMPLETE** — the definition gap is fully characterized and exact
language is proposed, but the criteria cannot be satisfied without owner
authorization (D1–D12) and, for items 4b, 5 and 6, work that is explicitly out of
scope for this unit.
