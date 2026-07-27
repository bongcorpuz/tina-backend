# COMMIT 5R1-C26 Monotonic Feature Spec

The C26 feature vector is a strict superset of the valid C24 V6 key. It preserves
all C24 fields and appends C25 structural features under a `c25_` prefix, so the
analysis cannot merge vectors that C24 already separated.

Forbidden inputs remain excluded: expected reason or decision, actual reason as a
separability feature, oracle ID, query hash, suite/family/category, row position,
fixture membership, and the full normalized query.

Included C24 fields: speechAct, clauseMood, finiteVerb, auxiliaryOrModal, requestMarker, operationClass, requestedOutcomeClass, headClass, relationSet, relationCount, taxPredicateScope, hasQuotedOperand, hasParentheticalOperand, identifierComplement, documentProcedureInstrumentRole, filipinoTaglishMorphology, metadataOnlySuffix, acronymReferentCompleteness, targetSpecificity.

Added structural fields include grammatical subject span class, tax complement span
class, tax predicate bearer, external object/event head, tax instrument head,
copular subject-to-tax construction, operand content availability, document title
versus supplied content, evidentiary support outcome, filing/remittance/
registration/deadline outcome, definition/expansion request, ordinary-world
context, quoted-operand scope, Filipino/Taglish morphology, metadata suffix and
acronym referent completeness.
