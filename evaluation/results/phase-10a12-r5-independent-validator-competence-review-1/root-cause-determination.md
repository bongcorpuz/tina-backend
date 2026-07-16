# Root Cause Determination

R5 did not modify validator runtime. It improved evidence governance and runner structure, but it did not change the validator behavior that produced invalid verified legal answers.

The root cause is not only an M-Q36-specific bug. It is a class-level validator competence gap:

- Source sufficiency is not enforced by proposition type.
- Generic topic-adjacent authorities can satisfy a verified answer even when they do not control the proposition.
- The LLM validator can approve a legal rule unsupported by the cited cards.
- Existing deterministic gates are cluster-specific and do not cover penalty/procedural questions or EWT/legal-form distinctions.

This explains both M-Q36 and M-Q25: each answer was verified using sources that are near the topic but not controlling for the actual proposition.