# COMMIT 5R1-C26 Pareto Acceptance Policy

This policy is prospective only. It does not rewrite C25 history and does not call
a frozen-suite-only rule an R3 reason gain.

A candidate may become the C26 controlling base only when all three open mandatory
reason gates are monotonic:

- R3 reason does not decrease.
- reason suite v8 does not decrease.
- collision probes do not decrease.
- at least one of those three gates strictly improves.

It must also preserve exact decision, relation, clause, guard and integrity gates,
with zero correct-row regression, zero wrong-to-different-wrong movement, zero
decision drift, zero relation drift, target/placement/composition/order safety,
derived generalization, and transitive anti-overfit.

This forbids weighted averaging, regression trading, aggregate-score acceptance,
and recharacterizing C25's frozen-gate-only gain as an R3 gain.
