# Public-Answer Replacement And Rejected-Output Non-Disclosure Review

For the four R9 blocker payloads and R10-DUETOMORROW final runtime:

- SG-C-LASTDAY: replaced, RELATED_AUTHORITY_ONLY, API equals history, unsafe public false.
- R9-LASTDAY-REPRO: replaced, RELATED_AUTHORITY_ONLY, API equals history, unsafe public false.
- R9-DUETODAY: replaced, RELATED_AUTHORITY_ONLY, API equals history, unsafe public false.
- SG-C-DUETODAY: replaced, RELATED_AUTHORITY_ONLY, API equals history, unsafe public false.
- R10-DUETOMORROW: replaced, RELATED_AUTHORITY_ONLY, API equals history, unsafe public false.

The replacement answer removes the old R9 problem: no retained "yes, today is the last day", no retained "due today, April 15", no practical-meaning instruction to file today, and no duplicated safety response.

ask-handler.js sets result.rejectedModelAnswer internally before replacing result.answer, but the constructed public payload enumerates fields and does not spread result. The public payload contains answer and answerSupport but not rejectedModelAnswer or calendarRelativeReplaced. The live harness also checked that rejectedModelAnswer and calendarRelativeReplaced were absent from each public API JSON response.

Final payload flags:

- rejectedModelAnswerExposed: false in 15/15.
- apiUnsafe: false in 15/15.
- historyUnsafe: false in 15/15.
- apiEqualsHistory: true in 15/15.
- trustConsistent: true in 15/15.

Conclusion: no rejected output exposure was found in final R10 evidence.
