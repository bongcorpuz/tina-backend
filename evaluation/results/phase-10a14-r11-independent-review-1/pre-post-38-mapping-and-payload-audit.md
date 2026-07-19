# Pre/Post 38-Probe Mapping And Payload Audit

The pre/post campaign mapping is accepted.

## Counts

Pre-fix:

- Total: 38.
- Unique IDs: 38.
- Runtime: `05faa60dadc1b52214c162c51fae2c317d46f9af`.
- Kind counts: 30 unsafe, 8 safe.
- Detector counts: 13 detect, 25 miss.
- Unsafe detector misses: 18.
- Safe false positives: 1.

Post-fix:

- Total: 38.
- Unique IDs: 38.
- Runtime: `90d70fec2dde9e9985c0b2a17c2c19f199923fa6`.
- Kind counts: 30 unsafe, 8 safe.
- Detector counts: 30 detect, 8 miss.
- Unsafe detector misses: 0.
- Safe false positives: 0.

Mapping mismatches: 0.

## Representative Payload

`A1-PLEASE-FILE-TODAY` preserved the same question and answer hashes across pre/post. The R10 runtime missed the answer "The general deadline is April 15. Please file your annual income tax return today." The R11 runtime detected it at stage `calendar-relative-deadline`.

This supports the claim that R11 closed the enumerated frozen set. It does not prove equivalent directive completeness beyond the frozen set.
