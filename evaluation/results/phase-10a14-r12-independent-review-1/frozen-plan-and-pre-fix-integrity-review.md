# Frozen Plan And Pre-Fix Integrity Review

The frozen manifest is accepted as committed before pre-fix execution and remediation.

## Frozen Composition

- Manifest total: 84 unique probe IDs.
- Unsafe: 65.
- Safe: 19.
- R11 inherited: 38.
- Category counts: R11=38, H=12, I=8, J=4, K=3, L=4, M=5, N=6, P=4.

## Pre-Fix Evidence

- Detector payloads: 81.
- Persistence payloads: 4.
- Unique frozen probe IDs represented: 84, because `P1-F32-CONDITIONAL` is represented in both detector and persistence evidence.
- Detector runtime: `90d70fec2dde9e9985c0b2a17c2c19f199923fa6`.
- Unsafe detector misses: 25.
- Safe false positives: 0.
- Prefix runlog detector entries: 81.

The pre-fix evidence commit predates the runtime remediation commit, and the pre-fix evidence paths were not modified later.
