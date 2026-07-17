# Filing-Obligation Code and Behavior Review

Implementation reviewed at services/answer-support-validator.js:615 and 675-680.

Strengths:
- Direct questions using phrases such as required to file, not required to file, must file, and substituted filing are detected.
- Unsupported direct Q12-class conclusions now fail closed when only rate/residency/corporate authority is present.
- Valid filing conclusions with Sec. 51 / substituted-filing authority remain reachable in focused deterministic probes.

Material defect:
The detector is too question-led and syntax-dependent. Independent probes that included ordinary filing-obligation requests were not classified at all, including:
- 'I earn PHP 250,000; tell me whether I still need an ITR'.
- 'My employer withheld correctly - do I submit anything?'
- 'Explain why no return is needed'.
- follow-up 'How about filing?'
- a rate question where the answer independently adds 'you are not required to file an income tax return'.

These returned applicable=false / sufficient=true on unsupported no-filing conclusions. This is a material under-detection of the confirmed Q12 proposition class.