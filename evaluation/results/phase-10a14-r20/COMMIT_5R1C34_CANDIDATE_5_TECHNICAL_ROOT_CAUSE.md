# Candidate 5 technical root cause

The original attempt remains **TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE** and **NOT_A_SEMANTIC_REJECTION**.

The exact aggregate failure was `C34_CANDIDATE_ONLY_DUAL_REPLAY_FAILED`. The replay helper threw before persisting its per-environment result, so the original evidence cannot support a claim about a specific failed Git subprocess or patch section. This missing failure-before-throw durability is the proven replay infrastructure defect. The preserved patch has canonical headers, the exact Candidate-4 base and Candidate-5 snapshot identities match, and superseding dual replay is required before any linked retry.
