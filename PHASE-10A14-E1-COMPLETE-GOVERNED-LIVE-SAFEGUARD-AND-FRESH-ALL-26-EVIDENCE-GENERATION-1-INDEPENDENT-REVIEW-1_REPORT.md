# PHASE-10A14-E1 Complete Governed Live Safeguard And Fresh All-26 Evidence Generation 1 Independent Review 1

Reviewer: Codex GPT-5, independent evidence-first review
Repository: C:\Projects\tina-backend
Branch: feature/source-availability-engine-v1
Review date: 2026-07-19
Decision: REVISIONS REQUIRED

## Executive Decision

PASS is not available. Independent review confirms two executor-reported release-blocking live-answer P1 classes and adds one strict inventory-governance P1. P0 = 0. P1 = 3. P2 = 2.

Confirmed live-answer P1s:
- P1-E1-001: SG-C-LASTDAY was VERIFIED_CONTROLLING while asserting a false today-relative deadline. The request ran on 2026-07-19, but the answer said today was the April 15 filing deadline.
- P1-E1-002: ALL26-Q12-r1/r2/r3 and SG-A-Q12REV were VERIFIED_CONTROLLING while making a filing conclusion from NIRC Sec. 24 rate/exemption-threshold authority rather than a properly conditioned filing-obligation rule.

Additional independent P1:
- P1-E1-003: canonical prior-probe inventory completeness is not proven under the frozen strict requirement. The E1 inventory maps 39 unique original references and discloses that A12/A13 broad probes are represented through R1-R8 descendants rather than recataloged verbatim. It does not enumerate every A12/A13 original probe ID with exact question, facts, taxpayer, return type, dates, proposition, expected authority, expected trust behavior, and final E1 mapping. Under the review packet, semantic descendant representation alone is insufficient, so the inventory is MATERIALLY INCOMPLETE for strict PASS purposes.

## Repository, Chronology, Sync, And Scope

Network-verified remote sync was refreshed with git fetch. Local HEAD, origin/feature/source-availability-engine-v1, and actual remote branch head all matched:

- Final E1 HEAD: 5e3aa87f54e65b9899ce9d8b86db5221bc11b1ec
- Base before E1: 893820600ec2cb58c939817f0a04f8dc4afff4c3
- Approved R8 runtime: 79be634df2068a5d5ba8f40aaf49b490c64811fb
- Sync after fetch: 0 0

E1 commits independently derived:

| Commit | Parent | Time +0800 | Message |
|---|---|---:|---|
| 886c6055dfbf8b9048299ab20fdff7433620f656 | 893820600ec2cb58c939817f0a04f8dc4afff4c3 | 2026-07-19 09:11:05 | PHASE-10A14-E1 COMMIT 1: frozen manifest, inventory, plans, harness, preflight |
| b02c091d8a7976adf08424eafda189588496734a | 886c6055dfbf8b9048299ab20fdff7433620f656 | 2026-07-19 09:45:09 | PHASE-10A14-E1 COMMIT 2: complete raw live evidence (115 immutable payloads) |
| 918ad8822ea75eb9cc76aece6a272c61f7090b55 | b02c091d8a7976adf08424eafda189588496734a | 2026-07-19 09:55:30 | PHASE-10A14-E1 COMMIT 3: adjudication, reconciliation, report, result, CURRENT_STATE |
| 5e3aa87f54e65b9899ce9d8b86db5221bc11b1ec | 918ad8822ea75eb9cc76aece6a272c61f7090b55 | 2026-07-19 10:02:17 | PHASE-10A14-E1 COMMIT 4: clean-tree gates + evidence manifest |

Changed-file scope from 8938206..HEAD is evidence/report only plus knowledge/CURRENT_STATE.md. No runtime, tests, model, prompt, retrieval, reranker, validator, source-card, temporal resolver, corpus, vector store, database/schema, frontend, Dev Factory, or production configuration file was changed by E1.

## Manifest Chronology, Runtime Lock, And Harness

The frozen manifest/harness commit preceded the first matrix requests. Commit 1 was recorded at 2026-07-19 09:11:05 +0800. The 115 payload request timestamps begin after that point; sample P1 timestamps include ALL26-Q12-r1 at 2026-07-19T01:13:26.756Z and SG-C-LASTDAY at 2026-07-19T01:31:03.320Z.

The runtime/model/corpus lock is accepted:
- staging runtime commit: 893820600ec2cb58c939817f0a04f8dc4afff4c3
- reviewed runtime commit: 79be634df2068a5d5ba8f40aaf49b490c64811fb
- governed runtime diff between 79be634 and 8938206 for checked runtime paths: none
- model in payloads: gpt-4o-mini
- corpus: tina_vector_store, 5,346 chunks, as recorded in WS1
- model configuration: runtime default, no temperature/sampling override recorded

Harness integrity is accepted for evidence capture. The harness and committed evidence show 115 planned calls, 115 completed payloads, 0 technical failures, 0 technical retries, append-only runlog evidence, attempt number 1, and no evidence of best-answer selection, answer editing, prompt/model modification, source injection, vector mutation, reindexing, or direct SQL writes.

## Canonical Inventory Completeness

Strict inventory classification: MATERIALLY INCOMPLETE.

The E1 CANONICAL_PRIOR_PROBE_INVENTORY.json maps 39 unique original references, and the E1 manifest contains 42 mapped original-reference entries across 115 probes. Seventy-three manifest probes have no mappedOriginalProbeIds. That can be acceptable for new positive/safeguard probes, but it does not satisfy the frozen review requirement that every original probe ID map to final evidence.

The inventory's own note says A12/A13 broad probes are represented through surviving R1-R8 safeguard descendants rather than re-cataloged verbatim. The review packet requires exact original question/facts/taxpayer/return type/period/date/proposition/authority/trust mapping and states that semantic similarity alone is insufficient. Because E1 does not record literal A12/A13 original-ID mapping and exact duplicate equivalence, the inventory is not complete enough for PASS.

## 115 Payload Completeness And Reconciliation

Independent count pass matches the executor's package:
- payload JSON files: 115
- manifest probes: 115
- runlog completions: 115
- unique probe IDs: 115
- technical failures: 0
- total technical retries: 0

Trust distribution:
- VERIFIED_CONTROLLING: 29
- RELATED_AUTHORITY_ONLY: 69
- NO_VERIFIED_AUTHORITY: 12
- NOT_APPLICABLE: 5

Class distribution includes 26 all26_live, 29 main-positive probes, and 60 safeguards. Payloads, runlog, and manifest reconcile.

## Deterministic All-26 Replay And Fresh All-26 Review

The deterministic all-26 replay is accepted: 9 blocked / 17 preserved / 0 mismatch, pass true. The nine blocked slots are Q12-r1/r2/r3, Q30-r1/r2/r3, and Q34-r1/r2/r3 at proposition-source-sufficiency. Q3/Q47 overfire check is clean, and Q32 remains reachable.

Fresh all-26 live slots are complete at 26/26. However, ALL26-Q12-r1/r2/r3 are part of the four Q12 verified-overbroad results and therefore block PASS despite the deterministic all-26 gate itself matching expectations.

## All-29 Verified-Answer Adjudication

The 29 VERIFIED_CONTROLLING answers were reviewed from WS10 and targeted raw payloads. The executor's adjudication is accepted for the two P1 classes: 24 are valid/appropriately verified, and 5 are questionable or over-verified.

Five questionable/over-verified table:

| Probe | Class | Trust | Independent verdict | Reason |
|---|---|---|---|---|
| ALL26-Q12-r1 | all26_live | VERIFIED_CONTROLLING | QUESTIONABLE / OVER-VERIFIED | Filing conclusion is stated from Sec. 24 threshold/rate logic and not properly conditioned on filing-obligation authority. |
| ALL26-Q12-r2 | all26_live | VERIFIED_CONTROLLING | QUESTIONABLE / OVER-VERIFIED | Same Q12 filing conclusion laundering; Sec. 51 appears in cards but the answer grounds control in Sec. 24 threshold logic. |
| ALL26-Q12-r3 | all26_live | VERIFIED_CONTROLLING | QUESTIONABLE / OVER-VERIFIED | Same Q12 filing conclusion laundering; categorical non-filing conclusion is overbroad. |
| SG-A-Q12REV | safeguard_r1_reviewer | VERIFIED_CONTROLLING | QUESTIONABLE / OVER-VERIFIED | R1 Q12 safeguard recurs at generation layer. |
| SG-C-LASTDAY | safeguard_filing_deadline | VERIFIED_CONTROLLING | QUESTIONABLE / OVER-VERIFIED | False today-relative conclusion was verified although 2026-07-19 is not April 15. |

No additional distinct invalid-verified answer was confirmed beyond these five payloads. The five payloads group into two answer-behavior root causes: today-relative temporal fabrication and Sec. 24-to-filing laundering.

## SG-C-LASTDAY Review

Question: Is today the last day to file the annual income tax return of an individual?
Request timestamp: 2026-07-19T01:31:03.320Z
Trust: VERIFIED_CONTROLLING
Displayed cards: NIRC Sec. 51, NIRC Sec. 23, NIRC Sec. 24, NIRC Sec. 27

The answer starts by affirming that today is the last day to file and then cites the April 15 annual ITR deadline. The statutory April 15 statement is correct, but the today-relative assertion is false on July 19, 2026. The answer should not have been verified as controlling. P1-E1-001 confirmed.

## Four-Q12 Review

ALL26-Q12-r1, ALL26-Q12-r2, ALL26-Q12-r3, and SG-A-Q12REV ask whether an individual with PHP 250,000 gross compensation income in 2024 is required to file an income tax return. All four were VERIFIED_CONTROLLING. All four answers say the taxpayer is not required to file because the income falls within the tax-exempt threshold and identify Sec. 24 rate/exemption reasoning as controlling. Sec. 51 appears in some source cards, but the answer's filing conclusion is not grounded in the material filing/substituted-filing conditions.

This localizes the defect to live generation/final trust aggregation allowing a generated filing proposition to be verified where the answer's controlling rationale is rate/exemption authority. P1-E1-002 confirmed.

## Positive Reachability, False Refusal, Persistence

Required positive classes remain genuinely reachable with valid verified examples:
- individual filing obligation: SG-B-COMPONLY and SG-B-SELFEMP
- individual filing deadline: ALL26-Q34-r1/r2 and POS-INDDEAD-1/2
- substituted filing: POS-SUBST-1/2/4/5

Additional positives were inspected through WS10/WS11: donor, estate, MCIT, non-VAT invoice, bad debts, EWT, historical ordinary filing, registration, VAT exception, and ordinary VAT. Downgrades remain professionally useful where they fail closed.

Material false refusal remains 0. RA 12214 is not indexed in the corpus for Section 51(C)(2) post-effectivity positives; the runtime fails closed rather than prematurely applying unindexed later law. This is P2/deferred source acquisition, not a P1 false refusal on this evidence.

Persistence review is accepted: 10/10 persistence cases consistent, 0 mismatches. Consistency proves faithful persistence, not legal validity; it does not cure P1-E1-001 or P1-E1-002.

## Runner Verification

Fresh independent runners passed:
- node scripts/run-regressions.mjs cycle 1: syntax 10/0, deterministic 198/0, exit 0
- node scripts/run-regressions.mjs cycle 2: syntax 10/0, deterministic 198/0, exit 0
- node scripts/run-staging-smokes.mjs cycle 1: staging 7/0, exit 0
- node scripts/run-staging-smokes.mjs cycle 2: staging 7/0, exit 0

The staging lane remains mandatory and was not skipped.

## Security And Cleanup

No secret exposure, real taxpayer/client data, raw credentials, authorization headers, runtime change, test change, model/prompt/configuration change, direct database write, schema migration, vector mutation, reindex, re-embedding, source ingestion, corpus/source-bank change, frontend/Dev Factory change, or production deployment was found. Protected paths .claude/, .vscode/, and evaluation/factcheck/ were preserved. No local backend listener was started by this independent review; port 5173 was untouched.

## Final Decision

REVISIONS REQUIRED

PASS fails because P1 > 0, questionable/over-verified verified answers > 0, fabricated today-relative deadline > 0, Sec. 24 filing-authority laundering > 0, and strict canonical inventory completeness is not proven.
