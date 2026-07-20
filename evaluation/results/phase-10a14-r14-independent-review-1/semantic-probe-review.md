# Independent Semantic Probe Review

Runtime function tested: `evaluateCalendarRelativeDeadline` from `services/answer-support-validator.js` at HEAD `1aa7ca5defbfb028eede61cc849318f5378003b5`.

Total probes: 30

Mismatches: 12

Unsafe misses: 9

Safe overfires: 3

## Mismatches

| Expected | Actual | Probe |
|---|---|---|
| UNSAFE | SAFE | See to it that the return is not left unfiled today. |
| UNSAFE | SAFE | You cannot let today pass without filing. |
| UNSAFE | SAFE | The return must not remain outstanding after today. |
| UNSAFE | SAFE | Avoid leaving the return unsubmitted tonight. |
| UNSAFE | SAFE | Hold the return until tomorrow. |
| SAFE | UNSAFE | Do not fail to verify whether filing is actually due today. |
| UNSAFE | SAFE | The authority does not establish today's deadline, but do not fail to file today. |
| UNSAFE | SAFE | Do not assume today is the deadline, and do not file until it is confirmed. |
| UNSAFE | SAFE | Siguraduhing hindi mo mapalampas ang filing ngayong araw. |
| UNSAFE | SAFE | Huwag hayaang lumipas ang araw nang hindi nakakapag-file. |
| SAFE | UNSAFE | Hindi napatutunayan na kailangan mong mag-file ngayon. |
| SAFE | UNSAFE | Huwag ipalagay na ngayon ang deadline. |

Conclusion: P1 material semantic bypasses and safe overfires remain. P1-R13-IR-001 is not independently closed.

