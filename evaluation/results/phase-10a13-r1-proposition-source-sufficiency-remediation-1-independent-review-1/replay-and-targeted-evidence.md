# Replay And Targeted Evidence

## Pre-Patch Defect Reproduction

Committed A13 payloads confirmed:

| run | committed trust | pre-patch deterministic class coverage |
|---|---|---|
| Q38-r1 | VERIFIED_CONTROLLING | not covered; old gate had penalty/EWT only |
| Q38-r2 | VERIFIED_CONTROLLING | not covered; old gate had penalty/EWT only |
| Q38-r3 | VERIFIED_CONTROLLING | not covered; old gate had penalty/EWT only |
| Q46-r1 | VERIFIED_CONTROLLING | not covered; old gate had penalty/EWT only |

The `d6fbf29` pre-patch blob confirms `evaluatePropositionSourceSufficiency` returned only `penalty_procedural`, `withholding_ewt`, or null. No `registration_procedural` or `vat_exception` class existed.

## All-30 A13 Verified Replay

Independent replay command: current `evaluatePropositionSourceSufficiency` applied to all 30 runs listed in `verified-adjudication-worksheet.md`.

Newly blocked:

| run | class | reason |
|---|---|---|
| Q38-r1 | registration_procedural | registration_proposition_without_registration_authority |
| Q38-r2 | registration_procedural | registration_proposition_without_registration_authority |
| Q38-r3 | registration_procedural | registration_proposition_without_registration_authority |
| Q46-r1 | vat_exception | vat_exception_proposition_without_exception_authority |

Other 26 valid verified payloads blocked: 0.

Notable unaffected sample:

- Q1-r1/Q1-r3: registration-related VAT threshold answers were applicable but sufficient because NIRC Sec. 236 was present.
- Q3/Q34: not blocked despite citation-precision P2.
- Q47/Q48: not blocked.

## Targeted 23-Run Live Evidence

Direct parse of `payloads/*.json` and `set-r1live-runlog.json` reproduced:

| item | result |
|---|---:|
| Payloads | 23 |
| Runlog entries | 23 |
| Runtime mismatches | 0 |
| Persistence failures | 0 |
| Payload/runlog hash mismatches | 0 |
| VERIFIED_CONTROLLING | 2 |
| RELATED_AUTHORITY_ONLY | 21 |
| Invalid verified | 0 |
| Questionable verified | 0 |

Groups:

| group | runs | verified |
|---|---:|---:|
| q38exact | 5 | 0 |
| q38para | 3 | 0 |
| q46exact | 5 | 0 |
| q46para | 2 | 1 (`Q46-p1`, valid Sec. 109 control) |
| q5 | 2 | 0 |
| q8 | 1 | 0 |
| q25 | 1 | 0 |
| q36 | 1 | 0 |
| reach | 2 | 1 (`Q47-a`) |
| restriction | 1 | 0 |

Verified IDs:

- `Q46-p1`: valid VAT-exempt treatment on `NIRC Sec. 109`.
- `Q47-a`: valid donor's-tax control.

Registration reachability:

- The committed 23 live payloads did not include a full live VERIFIED registration-positive control.
- `Q1-a` failed at `stage: structural`, reason `empty_primary_answer_section`, not proposition-source-sufficiency.
- Focused tests and an independent mocked approving validator probe confirmed a valid registration answer with `NIRC Sec. 236` / `RR 7-2012` reaches and can pass the LLM stage.
- Classified as P2 evidence limitation, not P1 overfire.

## Independent Extra Behavior Probes

| probe | result |
|---|---|
| Branch-transfer registration on RR 16-2005 | fails closed as registration_procedural |
| Annual ITR Form 1701 question | not registration_procedural |
| General 12 percent VAT rule | not vat_exception |
| Income-tax exemption | not vat_exception |
| Residential lease VAT-exempt with NIRC Sec. 109 | vat_exception sufficient |
