# Findings Register

## P1-R11-IR-001

Severity: P1
Status: OPEN
Title: Calendar directive detector completeness remains incomplete

Independent equivalent directive probes still bypass `calendar-relative-deadline` replacement. The bypasses include recommend/advise/would/without delay/within the day/at once/can file/to avoid penalties forms. Because replacement is stage-gated, these misses are material public-answer exposure risks.

## P1-R11-IR-002

Severity: P1
Status: OPEN
Title: Live handler API/history mismatch remains in the R11 subset

`F32-CONDITIONAL-NO-CONCLUSION` records `apiEqualsHistory:false`, with a NOT_APPLICABLE API answer and empty history answer. This violates the R11 PASS condition requiring zero API/persistence/history mismatches.

## P3-R11-IR-003

Severity: P3
Status: OPEN_NON_MATERIAL
Title: Prefix/postfix manifest self-reference hash defect

Prefix and postfix manifests contain self-entries that cannot match once finalized. All non-self entries validate and the final R11 manifest validates. This should be cleaned up in future evidence builders but is not the reason for REVISIONS REQUIRED.
