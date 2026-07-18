# PHASE-10A14-R4 Individual Filing Obligation / Deadline / Substituted-Filing Authority Retrieval-Surfacing Remediation 1 Independent Review 1

Decision: REVISIONS REQUIRED
Reviewer: Codex GPT-5
Review date: 2026-07-18
Reviewed HEAD: 31a4070a705b8e78f58693f2bcbe519d7f605598
Branch: feature/source-availability-engine-v1

## Scope And Ancestry

The R4 six-commit sequence reconciles from R3 independent-review commit b3b8714c68eb6e5079852f575b70f7773f273426 through HEAD 31a4070a705b8e78f58693f2bcbe519d7f605598:

1. bf0b2b83961fd9c070eeda8c7059f5c622f56746 - diagnosis, manifest, legal verification.
2. 5d3e246c7d5f50d372c50639c70687d9db5deeae - Sec. 51 / 51-A bridge and tests.
3. 4768da9e127270e5454a6a2c51b597171cce20c4 - pipeline intent preservation and filing-authority routing.
4. 95eb65e2d410fbfe823de1e7db658ebe82342110 - authority-slot reservation and live evidence.
5. da285a130a60560da6883cdc3974ce662f0ee27d - report, CURRENT_STATE, evidence manifest.
6. 31a4070a705b8e78f58693f2bcbe519d7f605598 - WS17 gate logs and refreshed manifest.

Changed runtime scope is confined to vector-store.js and pipeline.js; the new focused test is tests/phase-10a14-r4-sec51-filing-authority-bridge.test.mjs. No remediation was performed in this review. Protected untracked paths .claude/, .vscode/, and evaluation/factcheck/ were preserved.

## What Passed

R4 correctly localizes the R3 source-surfacing blocker to indexed NIRC Sec. 51 / 51-A text whose stored normalized_reference labels lag behind the actual statutory section. The bridge in vector-store.js searches the genuine NIRC-1997-RA-10963 source by stable statutory content markers, re-labels only those live rows as NIRC Sec. 51, NIRC Sec. 51(C), or NIRC Sec. 51-A, marks them Tier-1 exact-authority matches, and reserves bridge slots so rate provisions cannot crowd them out.

Fresh reviewer checks:

- Focused bridge suite: node tests\phase-10a14-r4-sec51-filing-authority-bridge.test.mjs -> 20/0.
- Deterministic regressions: node scripts\run-regressions.mjs -> syntax 10/0 and deterministic suites 194/0.
- Staging smokes: restricted sandbox run hit the known staging reachability failure; network-enabled rerun passed 7/0.
- git diff --check over the R4 diff passed.
- Executor manifest hashes for the six listed files recomputed exactly.
- Independent all-26 deterministic replay over the A14 verified payloads blocks exactly Q12-r1/r2/r3, Q30-r1/r2/r3, and Q34-r1/r2/r3; 17 other verified payloads remain sufficient or out of the new filing/estate classes.
- Read-only live exactAuthoritySearch sample, run with network enabled and no DB writes, surfaced bridge rows for natural individual filing, natural individual deadline, natural substituted filing, and explicit Sec. 51-A. Each sample returned NIRC Sec. 51, NIRC Sec. 51(C), and NIRC Sec. 51-A rows from 01-tax-code/nirc-1997-ra-10963-(bir).pdf with metadata.sec51FilingAuthorityBridge=true, exactAuthorityMatch=true, and authorityMatchTier=1.

## Blocking Findings

### P1-R4-001: Sec. 51 current-law chain is incomplete; RA 10963-only source cards are not enough for PASS

The R4 bridge hardcodes the live source filter to NIRC-1997-RA-10963 at vector-store.js:2293 and the bridge rows observed in the live exact-search sample all come from 01-tax-code/nirc-1997-ra-10963-(bir).pdf. That is a genuine source, but it is not the complete current-law chain for Sec. 51 as of 2026-07-18.

Primary-source check:

- RA 10963 amended Sec. 51 and created Sec. 51-A: https://elibrary.judiciary.gov.ph//thebookshelf//showdocs/2/80559
- RA 11976, approved January 5, 2024, further amended NIRC Sec. 51: https://elibrary.judiciary.gov.ph//thebookshelf//showdocs/2/96948
- RA 12214, approved May 29, 2025, further amended NIRC Sec. 51(C) for capital-gains return timing: https://elibrary.judiciary.gov.ph//thebookshelf//showdocs/2/99213

The executor report states that the RA 10963 consolidated text is current/operative. That statement is materially incomplete. Some ordinary annual-return propositions may still align with later law, and Sec. 51-A may remain the correct substituted-filing authority, but a VERIFIED_CONTROLLING source card cannot be treated as current without accounting for the later Sec. 51 amendments or clearly qualifying the card as part of an amendment chain. PASS is blocked under the packet rule that later amendments and current-law conflicts must be accounted for.

### P1-R4-002: PASS evidence package is incomplete and internally inconsistent

The R4 report itself says the extended matrices, R3 failed-positive replay, all-26 A14 replay, and R1/R2/R3 prior-safeguard preservation matrix were not yet run. Later evidence adds runner logs, but the committed evidence package still lacks the required replay and safeguard artifacts for an unqualified PASS.

The committed live-positive-negative matrix is also not a complete all-three-classes end-to-end PASS record. In the main matrix, POS-IND-FILING and POS-SUBSTITUTED are RELATED_AUTHORITY_ONLY, while POS-IND-DEADLINE is VERIFIED_CONTROLLING. The isolated runs demonstrate VERIFIED_CONTROLLING for individual filing and substituted filing, but that is not the same as a complete exact/natural live-positive matrix for all three classes. The independent read-only exact-search sample confirms retrieval surfacing, but it does not replace the missing end-to-end ask/reviewer artifact required by the authorization packet.

## Non-Blocking Finding

### P2-R4-003: Bare imperative filing instructions remain under-detected by the deterministic proposition gate

Fresh reviewer probes show that bare imperative answers such as "File the annual income tax return," "Submit the annual income tax return on time," "Lodge the annual return," and "Accomplish and file BIR Form 1701" return applicable=false/sufficient=true when only Sec. 23/24/27 rate/residency sources are present. The gate does catch richer forms such as "File the return and attach the required documents" and answer-introduced "you must file the annual income tax return." This is not the primary R4 retrieval task, but it is a residual source-sufficiency coverage edge that should not be closed as fully addressed.

## Final Decision

REVISIONS REQUIRED.

The R4 bridge is a real improvement and independently surfaces genuine Sec. 51/51(C)/51-A rows in live read-only retrieval. However, PASS is blocked because the current-law amendment chain is not accounted for and the committed PASS evidence is incomplete/inconsistent against the authorization's exact requirements. No runtime, retrieval, reranker, source-card, validator, test, fixture, DB, vector metadata, reindex, source-bank, corpus, model, prompt, frontend, Dev Factory, deployment, Phase 10A closure, Phase 10B/10C, full 50x3, or Gemini action was performed by this review.
