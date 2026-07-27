# COMMIT 5R1-C22 Anti-Overfit Gate Spec

The C22 gate scans candidate runtime source, candidate patches, patch scripts,
imported predicate files and generated runtime snapshots before any reason score can be
treated as governance-controlling.

It fails on oracle IDs, query hashes, suite/family/cluster/category identifiers,
scenario/control/item/variant numbers used as selectors, complete exact queries,
anchored near-complete templates, fixture-specific alternations, ordinary-object or
joke-specific whitelists, expected decision/reason maps, serialized feature vectors and
source-set or fixture membership selectors.

The gate records contextual matches in prior noncandidate evidence, but a C22 candidate
fails when the scanned candidate source contains any blocking selector. The C21 accepted
`item \\d+` predicate and the C21 fixture-shaped predicates are red-team failures.
