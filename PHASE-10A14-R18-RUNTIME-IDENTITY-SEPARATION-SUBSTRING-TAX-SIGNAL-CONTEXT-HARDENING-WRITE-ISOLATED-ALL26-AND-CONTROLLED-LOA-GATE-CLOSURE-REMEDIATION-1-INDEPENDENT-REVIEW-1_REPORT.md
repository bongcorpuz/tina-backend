# PHASE-10A14-R18 Independent Review 1

Decision: REVISIONS REQUIRED

R15 historical governance: NOT SUPERSEDED
R16 prospective governance: NOT SATISFIED
R17 prospective governance: NOT SATISFIED
R18 prospective governance: NOT SATISFIED
Phase 10A: OPEN

## Controlling Findings

P1-R18-IR1-001: independent unseen domain campaign failed. The reviewer-created oracle was frozen in 15_independent_unseen_domain_oracle.json before execution. Result: 497/567 pass, 67 material false allows, 3 material false refusals, 12 metamorphic failures. Any material false allow/refusal is P1 under the authorization.

P1-R18-IR1-002: R18's new anchors are genuine in tax contexts but over-expanded out-of-scope protection. Failed examples include SLSP as unknown project code, OSD as on-screen display, FLD as field abbreviation, MCIT/RCIT arbitrary codes, Alphalist as an ordinary list, gross estate marketing phrase and prescriptive period in medicine.

First failed examples:
- IR18-DOM-037: expected ALLOW, got CLARIFY/weak_tax_signal_needs_context; official receipt
- IR18-DOM-106: expected ALLOW, got REJECT/fail_closed_no_tax_signal; annual information return
- IR18-DOM-109: expected ALLOW, got CLARIFY/weak_tax_signal_needs_context; refund claim prescription
- IR18-DOM-158: expected NOT_ALLOW, got ALLOW/strong_tax_signal; lease contract renewal without tax
- IR18-DOM-161: expected NOT_ALLOW, got ALLOW/strong_tax_signal; customs in a culture class
- IR18-DOM-171: expected NOT_ALLOW, got ALLOW/strong_tax_signal; gross estate marketing phrase
- IR18-DOM-172: expected NOT_ALLOW, got ALLOW/strong_tax_signal; prescriptive period in medicine
- IR18-DOM-173: expected NOT_ALLOW, got ALLOW/strong_tax_signal; Alphalist as alphabetical list
- IR18-DOM-174: expected NOT_ALLOW, got ALLOW/strong_tax_signal; SLSP as unknown project code
- IR18-DOM-175: expected NOT_ALLOW, got ALLOW/strong_tax_signal; OSD as on-screen display
- IR18-DOM-176: expected NOT_ALLOW, got ALLOW/strong_tax_signal; FLD as field abbreviation
- IR18-DOM-177: expected NOT_ALLOW, got ALLOW/strong_tax_signal; MCIT as random product code
- IR18-DOM-178: expected NOT_ALLOW, got ALLOW/strong_tax_signal; RCIT as random training code
- IR18-DOM-182: expected NOT_ALLOW, got ALLOW/strong_tax_signal; BIR as a bird typo
- IR18-DOM-184: expected NOT_ALLOW, got ALLOW/strong_tax_signal; FAN cooling speed
- IR18-DOM-187: expected NOT_ALLOW, got ALLOW/strong_tax_signal; PAN cooking utensil
- IR18-DOM-190: expected NOT_ALLOW, got ALLOW/strong_tax_signal; RMC music channel
- IR18-DOM-191: expected NOT_ALLOW, got ALLOW/strong_tax_signal; gross receipts for a school raffle
- IR18-DOM-193: expected NOT_ALLOW, got ALLOW/strong_tax_signal; books of accounts as novel list
- IR18-DOM-194: expected NOT_ALLOW, got ALLOW/strong_tax_signal; transfer pricing in a board game

## Accepted Evidence

- Preflight matched repo, branch, HEAD c03e7794e49030face66928dbd3df91de0fa9f05, sync 0 0, protected untracked paths, no Node listener and port 5173 free.
- Commit chronology contains 15 R18 commits from 2108d447 through c03e7794; final runtime is 8413e022 and later commits are evidence/test/report-only.
- Runtime digest independently recomputes to 5dd969d78b2aeba33c14dc5173300a0aec9a05017715040192bf7540e0fa231a; harness digest to 48ea64c49263fd13dc99b51168208087cdd4bdc01722f919d117411b46fd6e9d.
- Registry independently reconstructs to 5 attempts, 4 controlling, 1 non-controlling, 1 incomplete, validRetryCount 1, retryErrors 0.
- R18 evidence manifest has 67 hashed entries, excludes itself, has no missing entries and no hash mismatches.
- Clean independent deterministic rerun passed twice: syntax 10/0 and test suites 214/0 both cycles. Initial contaminated run is preserved and explained by my own filename containing the substring production.
- Independent staging rerun passed twice at 7/0.
- Focused suites passed; all-26 external CLI proof wrote output and passed with blocked=9 preserved=17 mismatch=0.
- 09ZF scope guard, all-26 write isolation, retry identity, and disclosed Windows/validator defects are accepted as corrected for the governed R18 evidence.

## Claim Summary

Claims 1, 2, 20, 21, 22 and 25 are rejected. Claims 24, 26 and 44 are partially accepted. The remaining claims are accepted within the stated caveats. Full dispositions are in 35_claim_by_claim_adjudication.json.

## Scope And Security

No unauthorized runtime, production, model, provider, prompt, retrieval, reranker, sourceAvailability, corpus, vector, database, frontend, Dev Factory or protected-path change was found. No production deployment, E2, A15, Phase 10A closure, Phase 10B/10C/10G/10H, model migration, reindexing or ingestion was executed.

## Next Exact Task

Smallest next remediation: start a separately authorized R19 (or equivalent) domain-boundary remediation limited to the independent unseen false allows/refusals, especially acronym and phrase-level context controls for SLSP, OSD, FLD, MCIT, RCIT, Alphalist, gross estate and prescriptive period, then rerun an independent unseen campaign before any governance closure.
