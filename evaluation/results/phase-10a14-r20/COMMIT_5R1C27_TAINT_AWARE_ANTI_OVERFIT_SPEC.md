# COMMIT 5R1-C27 Taint-Aware Anti-Overfit Spec

Runtime-bearing surfaces are candidate runtime snapshots, candidate-only patches,
imported runtime helpers and generated source inserted into `services/`.

Evaluator orchestration may read oracle IDs, hashes, expected labels and suite metadata
only to score, serialize and report. It must not propagate them into runtime-bearing
bytes.

Non-propagation controls:

1. Replace oracle IDs, query hashes, expected labels and family names with unique
   taint sentinels in evaluator-only mirrors.
2. Regenerate candidate runtime and candidate-only patches.
3. Require runtime and candidate-only patch bytes unchanged.
4. Shuffle R3 and frozen-suite row order.
5. Require runtime and candidate-only patch bytes unchanged.
6. Remove evaluator-only labels after the structural packet is frozen.
7. Require identical generation.
8. Strictly scan runtime-bearing files for IDs, hashes, expected labels, suite selectors,
   fixture membership, complete fixture queries, serialized lookup vectors and
   noun-whitelist output controls.
