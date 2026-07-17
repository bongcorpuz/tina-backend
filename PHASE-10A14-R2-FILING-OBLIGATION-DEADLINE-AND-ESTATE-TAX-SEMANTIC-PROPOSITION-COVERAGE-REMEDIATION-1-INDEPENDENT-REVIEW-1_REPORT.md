# PHASE-10A14-R2-FILING-OBLIGATION-DEADLINE-AND-ESTATE-TAX-SEMANTIC-PROPOSITION-COVERAGE-REMEDIATION-1-INDEPENDENT-REVIEW-1

Independent reviewer: Codex GPT-5. Date: 2026-07-17.

Decision: REVISIONS REQUIRED

## Repository And Scope

- Repository: `C:\Projects\tina-backend`
- Branch: `feature/source-availability-engine-v1`
- Starting HEAD verified: `1aaada2d1eadb2c2a6d8ed41dd563755181ae77e`
- Expected ancestry verified: `7736cee -> 22b845a -> f3f3f31 -> 1aaada2`
- Upstream sync at start: `0 0`
- Worktree at start: no tracked changes; only protected untracked `.claude/`, `.vscode/`, and `evaluation/factcheck/`
- Protected paths were not modified, staged, restored, normalized, deleted, or cleaned.

Runtime implementation scope is consistent with the executor claim: commit `22b845a` modifies only `services/answer-support-validator.js` and adds `tests/phase-10a14-r2-filing-estate-semantic-proposition-coverage.test.mjs`. Later commits add evidence/reporting and update `knowledge/CURRENT_STATE.md`.

## Runner Verification

- `node scripts/run-regressions.mjs`: PASS, exit 0; syntax checks 10/0 and deterministic suites 192/0.
- `node scripts/run-staging-smokes.mjs` in the restricted sandbox: 7 suites ran, 1 failed because staging was reported temporarily unreachable by `phase-09r-tax-memo-runtime-staging-smoke-1`.
- Network-enabled rerun of `node scripts/run-staging-smokes.mjs`: PASS, exit 0; staging suites 7/0.

The committed evidence manifest for `evaluation/results/phase-10a14-r2-filing-estate-semantic-proposition-coverage-remediation-1/EVIDENCE_MANIFEST.sha256` was recomputed: 59/59 entries matched.

## Material Findings

### P1-1: Mixed-object suppression still bypasses decisive filing-obligation propositions

The implementation computes `wrongFilingObject` over combined question and answer text, then suppresses answer-introduced filing conclusions when any wrong-object term appears anywhere in the combined text.

Relevant implementation points:

- `services/answer-support-validator.js`: `C_WRONG_FILING_OBJECT`
- `services/answer-support-validator.js`: `const wrongFilingObject = C_WRONG_FILING_OBJECT.test(both);`
- `services/answer-support-validator.js`: `const aFilingConclusion = A_FILING_CONCLUSION.test(aN) && !wrongFilingObject;`

Independent probes that should fail closed as `filing_obligation` instead returned open/unclassified:

- `Do I need an ITR and what documents should I submit?` / `You do not need to file an ITR, but retain supporting documents.` -> `OPEN:none`
- `What do I file?` / `File the protest, but no annual return is required.` -> `OPEN:none`
- `The refund claim was filed, but must the taxpayer also file an ITR?` / `Yes, the taxpayer must file an income tax return.` -> `OPEN:none`

This directly violates the review packet's mixed-object requirement. A non-return object must not erase a separate return-filing proposition.

### P1-2: Common return-deadline formulations remain materially bypassable

Independent probes using ordinary relative-period and Taglish forms were not classified as `filing_deadline`:

- `Can I still file today?` / `Yes, you can still file the annual return until April 15.` -> `OPEN:none`
- `Pwede pa bang mag-file?` / `You can still file the income tax return until April 15.` -> `OPEN:none`

These are ordinary filing-deadline concepts. The detector's temporal signal excludes too many common "still file / today / pwede pa" deadline formulations, so the R2 semantic coverage claim is not supported.

### P1-3: Filing-deadline authority matching is not tax-type specific

The deadline authority regex accepts individual, corporate, estate, donor, VAT, and percentage-tax provisions in one pooled rule. It does not require the source authority to match the exact return/taxpayer/tax type in the proposition.

Independent probes:

- Individual ITR deadline citing only estate-return authority (`NIRC Sec. 90`, `NIRC Sec. 91`) -> `OPEN:filing_deadline`
- Estate-tax return deadline citing only individual filing authority (`NIRC Sec. 51`) -> `OPEN:filing_deadline`

Both should fail closed. This violates the requirement that filing authority match the exact taxpayer and tax type, and creates cross-tax-type authority laundering.

### P1-4: Correct estate-tax computation propositions are not required to have estate computation authority in the deterministic gate

The R2 gate blocks estate base misstatements, but when an estate computation is correct and source cards lack estate computation authority, the deterministic gate returns sufficient rather than failing closed.

Independent probe:

- `What is the taxable base for the 6% estate tax?` / `Estate tax is 6% of the net estate after allowable deductions.` with only `NIRC Sec. 1` and `NIRC Sec. 6` -> `OPEN:tax_computation_basis`

The review packet requires correct estate answers to require adequate rate/base/deduction authority. A correct but unsupported estate answer verified only because no misstatement pattern fired is insufficient.

### P1-5: Estate-base misstatement detection remains phrase-dependent

The estate misstatement detector does not materially cover an ordinary formulation that treats the standard deduction as a threshold:

- `How is estate tax computed?` / `The estate tax is 6% on the net estate amount above the standard deduction.` with estate rate authority -> `OPEN:tax_computation_basis`, `estateBaseMisstatement=false`

This is the same class of standard-deduction-as-threshold/base misstatement under a different surface form. It remains phrase-dependent enough to fail the PASS standard.

### P2-1: Focused R2 tests do not cover the material failures above

The focused suite passes 33/0, but it does not include the decisive mixed-object cases, same-class cross-tax-type authority laundering cases, unsupported correct estate computation cases, or the common `still file today` / `pwede pa bang mag-file` formulations. The suite therefore does not prove the claimed semantic coverage.

### P2-2: Committed live reconciliation presentation is internally inconsistent

`live-reconciliation.json` includes `INVALID_VERIFIED(neg families): estate:ES-09`, while the executor report treats ES-09 as valid positive reachability. The ES-09 payload itself is a correct net-estate answer supported by Sec. 84/Sec. 86 labels, so this appears to be a reconciliation classification/reporting defect rather than a legal invalid-verified finding. It should still be corrected because report/result consistency is part of the evidence standard.

## Positive Evidence Confirmed

- Repository/branch/HEAD/ancestry/sync matched the authorization packet.
- Runtime change scope was narrow.
- The 16 prior R1 reviewer probes are represented in committed replay evidence as closed post-R2.
- The all-26 replay artifact reports exactly 9 Q12/Q30/Q34 target blocks and 0 valid newly blocked.
- Non-return overfire controls for a simple refund claim remained open/reachable in independent probing.
- Deterministic and staging runner gates passed after network-enabled staging rerun.
- Evidence manifest hashes reconciled.
- No secret, credential, cookie, authorization header, private key, private deployment URL, raw conversation ID, taxpayer/client information, corpus/index/model/prompt/frontend/Dev Factory/deployment change, or protected-path modification was found in the reviewed R2 artifact surface.

## Severity Register

| Severity | Count | Findings |
|---|---:|---|
| P0 | 0 | None found. |
| P1 | 5 | Mixed-object filing-obligation bypass; common deadline/Taglish bypass; cross-tax-type deadline authority laundering; unsupported correct estate computation passes deterministic gate; estate-base misstatement phrase-dependence remains. |
| P2 | 2 | Focused suite coverage gap; live reconciliation/report presentation inconsistency. |
| P3 | 0 | None recorded. |

## Final Decision

REVISIONS REQUIRED

PASS criteria are not met because P1 is not zero, material paraphrase/mixed-object/deadline bypasses remain, filing authority does not match exact taxpayer/tax type, correct estate computation authority is not deterministically required, and estate-base detection remains materially phrase-dependent.

No remediation, runtime modification, validator modification, test/fixture modification, question-bank/source-bank/corpus/vector/prompt/model change, reindexing, deployment, production change, frontend work, Dev Factory work, database/schema change, Phase 10A closure, Phase 10B/10C, adversarial release testing, full 50x3 rerun, or Gemini run was performed.
