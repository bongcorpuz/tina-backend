# PHASE-10A14-R6 — Pre-Execution Manifest, Reproduction & Prior-Probe Inventory

## WS1 Preflight (verified)
- Repo `C:\Projects\tina-backend`; branch `feature/source-availability-engine-v1`
- Starting HEAD `5d3e2adcbfb20d04544187034cf34c874a19dc83` ✅ matches expected
- Sync `0 0`; tracked worktree clean; protected paths (`.claude/`,`.vscode/`,`evaluation/factcheck/`) preserved
- Runtime ancestry preserved: R3 multi-proposition/compat, R4 bridge + intent + slot reservation, R5 temporal resolver + imperative filing
- Model `gpt-4o-mini`; corpus `tina_vector_store` (5346 rows); **no reindex / no DB write / no vector mutation**

## Permitted runtime files
`section51-authority-chain.js`, `services/ask-handler-public-source-sanitizer.js`, `services/answer-support-validator.js`, `vector-store.js`, `pipeline.js` (only if a projection fix is proven necessary), new `tests/phase-10a14-r6-*.test.mjs`.

## WS2 Reproduction of the 5 P1 findings (at starting runtime)
- **P1-R5-001 (public card metadata loss)** — reproduced: the R5 committed live matrix (`evaluation/results/phase-10a14-r5/live-matrix.txt`) records `chainReviewed=false` on every card including VERIFIED_CONTROLLING individual filing answers. Diagnosis: bridge rows carry the fields, but `mapRowToResult` flattens (drops `metadata`) and the reranker/SAS/DSF re-projection drops the top-level fields before the public sanitizer.
- **P1-R5-003 (51-A origin wrong)** — reproduced deterministically: `buildSection51AmendmentChainMetadata("NIRC Sec. 51-A").officialAmendmentLaws` = `[RA 8424]` only, omitting RA 10963 (which created 51-A).
- **P1-R5-004 (historical not resolved)** — reproduced deterministically: `resolveSection51AuthorityChain({propositionClass:"filing_obligation", taxableYear:2023})` returned `amendingAuthorities:[RA 10963, RA 11976]` — RA 11976 (eff. 2024-01-22) applied to a 2023 period; `taxableYear` was ignored (identical output for 2023/2024/null).
- **P1-R5-002 (substituted not VERIFIED in governed matrix)** — reproduced: R5 live matrix classified both substituted positives `RELATED_AUTHORITY_ONLY`. Cause analysis (WS7): formulations did not force all material substituted-filing conditions AND 51-A did not consistently reach the visible cards; LLM answer variance. Remediation: fact-complete governed positive formulations displaying Sec 51-A.
- **P1-R5-005 (incomplete governed live safeguard package)** — reproduced: no single reconciled governed live R1/R2/R3/R4/R5 safeguard matrix with generated answers, public cards, persistence, hashes and trust states exists in committed evidence.

## Remediation (this task)
- P1-R5-003 & P1-R5-004: `section51-authority-chain.js` rewritten with `originatingLaw`/`baseCode` distinction and an **event-aware** resolver (partitions reviewed laws into applicable / reviewedButNotApplicable / notYetEffective by resolved period from `taxableYear`/`filingEventDate`/`transactionDate`/`legalAsOfDate`).
- P1-R5-001: `services/ask-handler-public-source-sanitizer.js` **re-derives** the sanitized amendment-chain summary from a Section 51 card's own provision via the governed resolver, guaranteeing `chainReviewed=true` on the public card (and thus in the persisted response). Non-Section-51 cards get none.
- Focused suite `tests/phase-10a14-r6-...` (15/0) + preservation of R3/R4/R5/R6-penalty suites.

## Frozen probe classes (this task's live scope)
Metadata-propagation live check; substituted-filing fact-complete positive matrix; individual obligation/deadline positives; temporal current/historical controls; imperative-filing preservation; cross-tax overfire negatives.

## Prior-probe inventory (canonical, from committed R1–R5 artifacts)
A canonical inventory of prior required safeguard probes (R1 16 reviewer probes; R2 P1 families; R3 clause/deadline/compat/donor/failed-positive; R4 exact/natural Sec 51 + overfire + slot survival; R5 current-law/historical/transaction/imperative; canonical Q5/Q8/Q25/Q36/Q38/Q46 + registration/VAT/estate/outcome/accessor) is enumerated in the R5 and R4 review artifacts under `evaluation/results/`. **Honest scope note:** the complete governed *live* re-execution of this full matrix (100+ model calls, WS10) is the largest R6 deliverable; see the R6 report for what was executed live vs. deterministically preserved.

## Retry policy
Live: retry only on transport/timeout/empty-output/persistence-transport failure. Never retry a legally complete RELATED result for best-answer selection. Preserve every attempt.

## Expected regression baseline
Deterministic 195/0 → 196/0 with the new R6 focused suite; staging 7/0; both lanes ×2, exit 0.
