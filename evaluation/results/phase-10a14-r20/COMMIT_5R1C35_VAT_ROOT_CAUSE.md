# C35 VAT authority-conflict root cause

Status: `ROOT_CAUSE_PROVEN`

The production query “tell me more about VAT” returned NIRC §§105–108 and RR 16-2005 with `conflictState=POTENTIAL_CONFLICT`. A controlled local trace against the exact committed C34 source state evaluated 45 pairs and found two firing pairs: retrieval indices 4/5 and 5/8.

Both pairs are fragments of the same file, `01_TAX_CODE/NIRC-1997-RA-10963 (BIR).pdf`, and the same normalized authority, `NIRC Sec. 106`. They do not carry structured metadata identifying different positions, versions, effectivity periods, amendments, or supersession states.

The first invalid field is `trueConflicts[].pairAnalysis.conflict=true`, produced by `conflict-engine.js` through `analyzeConflictPair`. Shared VAT terms and a shared substantive dimension pass `sameIssueGate`; nearby words about taxable transactions, exemptions, zero-rating, and deductions create opposite lexical polarity. The engine then treats complementary chunks of one provision as opposing authorities.

`pipeline.js` Step 9 aggregates those pair results into `conflictAnalysis.hasConflict=true`. The conflict classifier correctly treats that incomplete upstream signal as `POTENTIAL_CONFLICT` with public `hasConflict=false`. The frontend also maps the contract correctly to “Possible authority conflict.” The incorrect state therefore begins in pair qualification, not in the classifier or presentation layer.

The governing invariant is: one authority record cannot supply two conflicting authority positions merely because it was chunked. A same-source, same-reference pair must fail the conflict gate unless structured metadata identifies genuinely distinct positions or temporal/version/supersession scopes.

This rule generalizes beyond VAT and preserves:

- true same-issue opposite positions from distinct authority records;
- structured pre/post-amendment or effectivity positions in a consolidated record;
- justified potential, hierarchy, effectivity, and supersession warnings;
- authority-support derivation as an independent contract.

The current live run was `VERIFIED_CONTROLLING`, not `RELATED_AUTHORITY_ONLY`. An independent proposition audit separately found that the broad input-VAT claim is not proven by the captured validator-visible passages. That support concern must be revalidated through the answer-support gate; it is not evidence of a conflict and the conflict patch must not promote or downgrade it.

