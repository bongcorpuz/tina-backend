# PHASE-10A14-R5 Section 51 Current-Law Chain, Imperative Filing, And Complete Evidence Remediation 1 Independent Review 1

Decision: REVISIONS REQUIRED
Reviewer: Codex GPT-5
Review date: 2026-07-18
Reviewed HEAD: 47657ec0ecdaa90a7f3a3f134c856f6b37df772c
Branch: feature/source-availability-engine-v1

## Scope And Ancestry

R5 reconciles as six linear commits from R5 base 188860434cdc221110cb06765739e3f603f52358 to HEAD 47657ec0ecdaa90a7f3a3f134c856f6b37df772c, with upstream sync 0 0 and only protected untracked paths .claude/, .vscode/, and evaluation/factcheck/ present.

Commit chronology:

1. d53ae37f4b26c917a4a865378f4f841e2a36e490, parent 188860434cdc221110cb06765739e3f603f52358, manifest, official amendment-chain verification, source-availability inventory.
2. d7b007fb8695e3023312fc4cfb234d2f44f62ebc, parent d53ae37f4b26c917a4a865378f4f841e2a36e490, current-law amendment chain, temporal sufficiency, imperative filing.
3. 56cda8aae683e72955f50e178c15631c4b90bf4a, parent d7b007fb8695e3023312fc4cfb234d2f44f62ebc, imperative-filing directive-mood fix.
4. ed7db318fe61e343328d853a7b8945ec97dd56c7, parent 56cda8aae683e72955f50e178c15631c4b90bf4a, amendment-chain summary plumbing to source-card layers, partial.
5. 1d1737aa607221f9c8dc5a8433dac384ec0936f3, parent ed7db318fe61e343328d853a7b8945ec97dd56c7, report, result JSON, live matrix, CURRENT_STATE.
6. 47657ec0ecdaa90a7f3a3f134c856f6b37df772c, parent 1d1737aa607221f9c8dc5a8433dac384ec0936f3, clean-tree gate logs and evidence manifest.

Runtime/test scope: section51-authority-chain.js added; services/answer-support-validator.js, services/ask-handler-public-source-sanitizer.js, and vector-store.js modified; one focused test added. No package, env, DB migration, frontend, Dev Factory, source-bank, corpus, model, or prompt file changed.

## What Passed

The official legal thesis for ordinary individual filing is mostly supported by primary sources: RA 11976 further amended Sec. 51 but principally changed filing/payment administration and added an OFW/OCW non-filing item; RA 12214 further amended Sec. 51(C)(2), the transaction-specific capital-gains return timing. The ordinary annual filing obligation, ordinary April 15 deadline, and Sec. 51-A substituted-filing rule were not shown to be changed by those later laws. Sources used: Supreme Court E-Library RA 8424, RA 10963, RA 11976, RA 12214; Lawphil RA 11976; BIR/EOPT implementing context including RR 4-2024 references.

Fresh reviewer execution:

- Focused R5 suite: 25/0.
- Independent resolver/temporal/imperative probes: ordinary annual Sec. 51(C) passes on Sec. 51; current transaction-specific Sec. 51(C)(2) fails closed without RA 12214; imperative "File the annual income tax return" fails closed on Sec. 24-only authority.
- All-26 A14 replay: exactly 9 blocked (Q12-r1/r2/r3, Q30-r1/r2/r3, Q34-r1/r2/r3) and 17 preserved; mismatch count 0.
- R3 failed-positive deterministic controls: rate-only individual filing/deadline fail closed; Sec. 51/51-A controls are sufficient; cross-tax estate authority cannot support individual deadline; imperative rate-only fails closed.
- Deterministic gate: fresh clean-tree runs passed twice, each syntax 10/0 and deterministic suites 195/0.
- Staging gate: restricted sandbox run failed the known phase-09r reachability assertion; two network-enabled reruns passed 7/0 and 7/0.
- Executor R5 manifest hashes recomputed exactly for listed artifacts.
- Read-only live exactAuthoritySearch confirms Sec. 51 bridge rows now carry amendment metadata at retrieval level.

## Blocking Findings

### P1-R5-001: public source cards still do not show reviewed current-law chain

The R5 live matrix records chainReviewed=false for every row, including VERIFIED_CONTROLLING individual filing obligation and individual filing deadline. The executor report and result JSON admit the same gap: amendment metadata exists earlier, but the finalSourceCards projection drops the top-level fields before the public card reaches the sanitizer.

Independent read-only exact search confirms the distinction: bridge rows for NIRC Sec. 51, Sec. 51(C), and Sec. 51-A carry amendmentChainReviewed=true at retrieval level, but the committed live public matrix shows chainReviewed=false. PASS requires public source cards accurately reflect reviewed currentness and required amendment metadata survives final projection. This criterion fails.

### P1-R5-002: substituted filing is not VERIFIED_CONTROLLING in the governed R5 main matrix

The committed R5 live matrix shows POS-02-subst and POSX-subst-1 as RELATED_AUTHORITY_ONLY, not VERIFIED_CONTROLLING, despite Sec. 51-A surfacing in one formulation. PASS explicitly requires a genuine main-matrix VERIFIED_CONTROLLING result for substituted filing on the final R5 runtime. R4 isolated verification cannot substitute for the R5 governed matrix.

### P1-R5-003: Sec. 51-A amendment-chain object misidentifies the official legal chain

buildSection51AmendmentChainMetadata("NIRC Sec. 51-A") and resolveSection51AuthorityChain({ propositionClass: "substituted_filing" }) return officialLaws containing only RA 8424, while RA 10963 is the law that created Sec. 51-A. The R5 focused test checks Sec. 51 metadata for RA 10963 but does not check Sec. 51-A metadata. This is a proposition-level amendment-chain defect for the substituted-filing class and blocks PASS.

### P1-R5-004: historical ordinary-filing periods are not actually resolved historically

resolveSection51AuthorityChain({ propositionClass: "filing_obligation", taxableYear: 2023 }) returns BASE_PROVISION_UNCHANGED_BUT_CHAIN_REVIEWED with amendingAuthorities [RA 10963, RA 11976]. RA 11976 was not yet effective for a 2023 filing-period proposition. The resolver is period-aware only for transaction-specific Sec. 51(C)(2); ordinary filing ignores taxableYear. The packet requires correct historical treatment and no silent current-period assumption. This fails.

### P1-R5-005: complete governed live/prior-safeguard evidence package remains incomplete

The R5 report admits the exhaustive all-26 replay and full R1/R2/R3/R4 prior-safeguard live matrix were not run as one reconciled R5 package. This review independently ran the all-26 deterministic replay and deterministic safeguard probes, but it did not produce a complete governed live prior-safeguard matrix with generated answers, public cards, persistence, request/response hashes, and final trust states for every required class. PASS requires that complete package.

## Final Decision

REVISIONS REQUIRED.

R5 materially improves the validator and retrieval-layer metadata, and P2-R4-003 is closed for the tested imperative filing bypass. But R5 does not satisfy the PASS criteria: public cards still lose reviewed-chain metadata, substituted filing remains non-verified in the main R5 matrix, Sec. 51-A metadata omits RA 10963, ordinary historical periods are not handled historically, and the complete governed live/prior-safeguard evidence package remains incomplete. No remediation, runtime/test/source-card/validator/retrieval/reranker/corpus/source-bank/vector/DB/schema/model/prompt/frontend/Dev Factory/deployment/full 50x3/Phase 10A closure/Phase 10B/10C/Gemini action was performed by this review.

Primary sources consulted:

- RA 8424, Supreme Court E-Library: https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/3896
- RA 10963, Supreme Court E-Library: https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/80559
- RA 11976, Supreme Court E-Library: https://elibrary.judiciary.gov.ph//thebookshelf//showdocs/2/96948
- RA 11976, Lawphil: https://lawphil.net/statutes/repacts/ra2024/ra_11976_2024.html
- RA 12214, Supreme Court E-Library: https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/99213
- BIR site context for EOPT/CMEPA and RR 4-2024 implementation references: https://www.bir.gov.ph/home
