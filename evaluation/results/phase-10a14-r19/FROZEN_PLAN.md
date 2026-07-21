# PHASE-10A14-R19 — FROZEN PLAN

Frozen before implementation. Not amendable after implementation begins. If a true
contract defect is discovered, the failure is preserved and R19 ends REVISIONS REQUIRED.

Executor: Sonnet 5 (low speed), primary per owner authorization.
Mandatory starting HEAD: `dcfcb77ef101317a23e3d23bba9e6187ba1fc54c`
Controlling review: PHASE-10A14-R18-...-INDEPENDENT-REVIEW-1 at `dcfcb77e`
R18 final runtime: `8413e022`

R19 is narrow, evidence-first, pre-fix-preserving, prospective, non-production,
single-runtime, adversarial, no-best-answer-retry, immutable-evidence governed. R19 does
not rewrite R18 or independent-review history. R18 remains NOT SATISFIED regardless.

## 1. Authorized scope

Remediates only:

| Finding | Subject |
|---|---|
| P1-R18-IR1-001 | Independent unseen domain campaign: 67 false allows, 3 false refusals, 12 metamorphic failures over a frozen 567-probe oracle |
| P1-R18-IR1-002 | R18 acronym/phrase anchors over-expanded protection: ambiguous acronyms and polysemous phrases treated as unconditional strong signals |

Accepted R18 closures (identity/retry model, all-26 write isolation, 09ZF classification,
deterministic/staging gate passes, manifest/provenance controls, disclosed-defect
corrections) are regression gates only, not reopened without direct regression evidence.

## 2. Terminology boundary

R19 repairs tax-domain ROUTING only. It does not implement Phase 10B-T (canonical
terminology registry), 10C-T (contextual acronym resolution gate) or 10H-T. R19 may
determine `What is SLSP?` is tax-adjacent; it must never hardcode or generate what SLSP
expands to as legal truth. Boundary recognition and canonical term knowledge stay
separate controls.

## 3. Root-cause taxonomy (see ROOT_CAUSE_TAXONOMY.json for full detail)

Diagnosed directly against the R18 independent-review failure set before any patch:

- **Missing veto coverage.** Most of the 67 false allows have NO existing non-tax-object
  veto pattern at all for their object family (on-screen display, cooking utensil,
  cooling device, bird, music channel, board game, exam grade, medicine, culture/
  tradition, real-estate marketing, software/code role markers, random SKU/course/
  product/training codes, field abbreviation, building directions, negotiation class,
  generic conference agenda).
- **Cosignal over-permissiveness.** Two sub-defects: (a) R18 wrongly included bare 2-4
  letter acronyms (`RMC`, `RMO`) directly in `TAX_COSIGNAL_PATTERNS`, so a coherent
  non-tax veto ("music channel") was defeated by the very acronym that IS the ambiguity;
  (b) a cosignal PHRASE ("VAT return", "subject to VAT") can match as a literal substring
  inside a sentence whose true subject is a programming/design role ("VAT return as
  function return value"), and the existing architecture let any cosignal match anywhere
  defeat any veto match anywhere, with no positional or role-based judgment.

## 4. Context-qualified decision model

See `CONTEXT_QUALIFIED_DECISION_SPEC.md` for the full specification. Summary: a new
**dominant non-tax role veto** tier is introduced. It runs before the existing (cosignal-
defeatable) non-tax object veto and before the strong-signal check, and is **never
defeated by any cosignal** — because every pattern in this tier names an object ROLE
(a variable, a device, a hobby, a body of knowledge) that is orthogonal to whichever tax
word happens to co-occur. `RMC`/`RMO` are removed from `TAX_COSIGNAL_PATTERNS` as bare
acronyms; cosignals must be full coherent phrases, never a bare 2-4 letter token.

## 5. Exact allowed-file inventory

Runtime files R19 may modify (written necessity, per owner authorization requirement):

- `services/philippine-tax-boundary-patterns.js` — new dominant-veto pattern tier,
  cosignal tightening. Necessity: this is the sole pattern-constant module; no boundary
  decision logic lives here.
- `services/philippine-tax-domain-boundary.js` — insert the dominant-veto check into the
  decision order before the existing veto/strong-signal steps. Necessity: this is the
  sole synchronous pre-retrieval classifier; the decision order lives only here.

No other runtime file is touched. `pipeline.js`, `server.js`, `ask-handler.js`,
`answer-renderer.js`, LOA workflow modules, retrieval/reranking modules,
`sourceAvailability`, corpus/index code are unmodified.

New test and evidence files are authorized under `tests/` and
`evaluation/results/phase-10a14-r19/`.

## 6. Frozen R19 development-oracle design

`R19_DEVELOPMENT_ORACLE.json` contains, immutably once frozen:

- all 567 independent-review rows, verbatim, as regression;
- accepted R15–R18 boundary closures, verbatim, as regression;
- ≥250 new context variants: ≥100 acronym tax/non-tax pairs, ≥60 polysemous phrase
  pairs, ≥40 Filipino/Taglish pairs, ≥30 typo/case/punctuation variants, ≥20 active-
  context-vs-explicit-non-tax controls.
- Minimum total 817 rows.

Expectations are frozen before final-runtime execution begins and are never altered
afterward. Every metamorphic group states which token/phrase changes and why the
expected decision changes.

## 7. Executor unseen campaign

A second, independently frozen oracle (`R19_EXECUTOR_UNSEEN_ORACLE.json`, ≥710 rows) is
authored AFTER the final runtime is frozen and is not used to design the patch. It reuses
no complete sentence from the 567-row review oracle or the 817-row development oracle.

## 8. Runtime/harness identity scope

R19 reuses the accepted R18 identity and retry-validator modules unmodified
(`evaluation/results/phase-10a14-r18/identity.mjs`,
`evaluation/results/phase-10a14-r18/retry-validator.mjs`). R19's own
`RUNTIME_SCOPE_MANIFEST.json` and `HARNESS_SCOPE_MANIFEST.json` are frozen fresh, listing
the two changed runtime files and the R19 harness files respectively.

## 9. Attempt-registry scope

Every governed invocation (pre-fix campaign, development-oracle campaign, unseen
campaign, each focused-suite batch, each deterministic cycle, each staging cycle, every
retry) is a registered attempt with `attemptCategory` drawn from the frozen R18 set:
`deterministic_runner | staging_runner | focused_suite | domain_campaign |
synthetic_validator | other`.

## 10. Required commit sequence

1. Frozen plan and contract — no implementation.
2. Immutable pre-fix evidence — 567 reproduction, failure matrix, taxonomy, accepted-
   closure regression, pre-fix digests. Push before patching.
3. Context-qualified runtime remediation — smallest authorized change, focused tests.
   Becomes R19 final runtime commit once focused tests pass.
4. Final development-oracle evidence — ≥817-row result, focused regression.
5. Executor unseen campaign — ≥710-row result.
6. onward — governed deterministic/staging gates, one attempt per commit, pushed before
   any retry.
7. final — report, result JSON, registry, summaries, CURRENT_STATE, self-excluding
   manifest.

## 11. Stop rules

R19 stops and reports REVISIONS REQUIRED if: a preflight precondition fails; the frozen
oracle is found to require amendment after execution begins (the defect is preserved,
not silently patched); a retry link fails validation; either gate fails to reach 2 valid
cycles within one attempt plus two valid technical retries; any focused suite exits
nonzero; a material false allow, false refusal, or unresolved metamorphic failure remains
in any of the three required campaigns; scope or protected-path integrity breaks.

## 12. Decision rule

Permitted: PASS or REVISIONS REQUIRED. No conditional PASS.
