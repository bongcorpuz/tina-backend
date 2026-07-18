# WS14 — ES-09 reconciliation correction record (governed)

The R2 independent review (P2-2) noted an internal presentation inconsistency in the
committed R2 evidence. This record corrects it WITHOUT modifying any historical R2
artifact.

## Original inconsistent field

File: `evaluation/results/phase-10a14-r2-filing-estate-semantic-proposition-coverage-remediation-1/live-reconciliation.json`
Field: the summary line `INVALID_VERIFIED(neg families): estate:ES-09`.

This line was produced by a crude heuristic in the R2 reconciliation script that counted
ANY verified result in the estate negative family as "invalid verified", regardless of
whether the answer was actually a base misstatement.

## Actual ES-09 payload classification (unchanged, authoritative)

File: `.../phase-10a14-r2-.../payloads/ES-09.json`
- Prompt: "What is the taxable base for the 6% estate tax under TRAIN?"
- Answer: a CORRECT net-estate statement — "the net estate ... gross estate value ...
  minus allowable deductions ... 6% applied to the net estate."
- Displayed authority: NIRC Sec. 89, 91, 84, 86 (estate rate Sec 84 + deductions Sec 86).
- Result: `verifiedEligible = true`, `authoritySupport = VERIFIED_CONTROLLING`.

## Legal adjudication

ES-09 is a LEGALLY CORRECT estate-computation answer (net estate = gross estate less
allowable deductions; flat 6% on the net estate) supported by controlling estate
authority (Sec 84 rate + Sec 86 deductions). It contains no base misstatement. It is a
VALID positive reachability result — it demonstrates the estate gate does not blanket-
suppress correct estate answers.

## Reason it is NOT an invalid verified

An "invalid verified" is a decisive legal proposition that received VERIFIED_CONTROLLING
without controlling authority (or while misstating the law). ES-09 is neither: the answer
is correct AND supported by controlling estate authority. The R2 line was a reconciliation
CLASSIFICATION defect (a family-wide heuristic), not a legal invalid-verified finding.
The R2 payload and report already treated ES-09 as valid positive reachability; only the
one JSON summary field disagreed.

## Correct treatment in R3

Under the R3 runtime, ES-09's authority (Sec 84 + Sec 86) satisfies the new estate
positive-authority-sufficiency check (rate → Sec 84; base/deduction → Sec 86), so a
correct ES-09-style answer remains reachable (see R3 focused test D4 and live POS-07).
All R3 reconciliation outputs classify a correct, adequately-supported estate answer as
VALID positive reachability — never as invalid verified. The R3 live reconciliation counts
"invalid verified" strictly as: a decisive proposition verified without matching
controlling authority OR while asserting a misstatement. By that definition R3 invalid
verified = 0.

## Preservation

The historical R2 artifact is preserved unchanged. This record supersedes only the
interpretation of that one field; it does not edit it.
