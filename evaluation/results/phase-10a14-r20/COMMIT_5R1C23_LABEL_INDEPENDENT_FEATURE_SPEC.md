# COMMIT 5R1-C23 Label-Independent Feature Spec

Feature vectors exclude expected reason, expected decision, actual reason, oracle id,
row position, query hash, suite/family/category membership and full normalized query text.

Allowed inputs are query syntax and deterministic analyzer evidence available at runtime:
speech act, clause mood, finite verb, auxiliary/modal, request marker, requested operation
class, requested outcome class, subject/head class, relation set, relation count, tax
predicate scope, quoted or parenthetical operands, identifier complements, document or
procedure role, Filipino/Taglish morphology, metadata-only suffix presence, acronym
referent completeness and target definiteness.

The vector key is used only for analysis. It is not a runtime lookup table and is not
serialized into the analyzer.
