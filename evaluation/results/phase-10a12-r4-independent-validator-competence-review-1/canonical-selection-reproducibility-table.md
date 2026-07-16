# Canonical Selection Reproducibility Table

| Check | Result |
| --- | --- |
| Master ID range claimed | Q1-Q50 |
| Reserved exclusions | 5, 8, 28, 32, 34, 35, 41, 46, 47 |
| Eligible pool size | 41 |
| Selection rule | Sort eligible IDs ascending and take first 30 |
| Expected selected IDs | M-Q1, M-Q2, M-Q3, M-Q4, M-Q6, M-Q7, M-Q9, M-Q10, M-Q11, M-Q12, M-Q13, M-Q14, M-Q15, M-Q16, M-Q17, M-Q18, M-Q19, M-Q20, M-Q21, M-Q22, M-Q23, M-Q24, M-Q25, M-Q26, M-Q27, M-Q29, M-Q30, M-Q31, M-Q33, M-Q36 |
| Manifest selected IDs | Exact match |
| Discretionary substitutions | 0 found |
| canonicalSetSha256 | 8e019480b2e710f9575e5f47d72716d9e94680b8bb3caa904cfe27f05c0f6ea1 |
| Serialization verified | SHA-256 over `id<TAB>prompt` rows joined by LF, no trailing LF |
| Per-question hash rows | 30 checked, 0 mismatches |
| Source bank committed | No; referenced master bank is protected untracked evidence |
| Question text not altered after freeze | Manifest text is frozen; source-bank immutability is not git-proven |

The deterministic selection itself reproduces. The source-bank provenance/immutability requirement does not fully pass because the referenced master bank is not tracked by git.