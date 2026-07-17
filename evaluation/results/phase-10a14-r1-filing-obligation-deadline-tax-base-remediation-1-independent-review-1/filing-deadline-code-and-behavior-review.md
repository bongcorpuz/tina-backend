# Filing-Deadline Code and Behavior Review

Implementation reviewed at services/answer-support-validator.js:617 and 675.

Strengths:
- The exact Q34 form and common 'deadline' / 'due date' formulations are detected.
- Valid individual and estate return deadline examples with return/deadline authority remain reachable.
- The gate returns before LLM validation when it fails.

Material defect:
The detector misses many ordinary return-deadline formulations that do not contain the preferred terms. Independent probes not classified included:
- 'Last day to submit individual AITR'.
- 'Individual ITR must be filed by what date?'
- 'Filing closes on what date for individual AITR?'
- 'What date applies to the annual ITR?'
- 'Is May 15 already late for my annual ITR?'
- 'How many days do I have to file the estate return?'
- 'Confirm the filing date.'

These returned applicable=false / sufficient=true even when sources were only non-deadline rate provisions. This is material under-detection of the confirmed Q34 class.