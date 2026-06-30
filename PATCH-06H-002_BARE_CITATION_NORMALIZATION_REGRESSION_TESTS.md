# PATCH-06H-002 - Bare Citation Normalization Regression Tests

Status: COMPLETE / TEST-ONLY / LOCAL PASS

Branch: feature/source-availability-engine-v1

## 1. Objective

Add focused offline regression coverage for bare citation and named authority queries before implementing any normalization fix.

## 2. Scope

This patch adds fixture/test coverage only:

```text
evaluation/fixtures/phase-6h-002-bare-citation-normalization-regression.fixture.json
tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
```

No runtime behavior was changed.

## 3. Baseline Basis From PATCH-06H-001

PATCH-06H-001 mapped the current retrieval, reranker, authority-normalization, sourceAvailability, and source-card selection boundaries.

Baseline conclusion carried forward:

```text
Bare citation defects should be tested first as issue-classification / exact-authority recognition targets before changing retrieval, vector-store lookup, sourceAvailability, or source-card rendering.
```

## 4. Parked Finding Addressed

This patch encodes the parked finding:

```text
FINDING-028A-F1
Bare citation query "RR 2-98" may route as GENERAL_TAX and produce RELATED_AUTHORITY_ONLY with 0 source cards.
```

The new fixture makes this a pending future runtime expectation for PATCH-06H-003 rather than an active failing runtime assertion.

## 5. Fixture File Added

```text
evaluation/fixtures/phase-6h-002-bare-citation-normalization-regression.fixture.json
```

The fixture contains 32 cases:

```text
20 exact_authority cases
5 case_card_integrity cases
7 generic_guard cases
```

The fixture reuses the existing Phase 6F evaluation categories to avoid changing the fixed runner category registry.

## 6. Test File Added

```text
tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
```

The test verifies:

```text
fixture validation
required query coverage
recognized category grouping
pending query-shape metadata
required expected-policy fields
generic guard controls
parked RR 2-98 finding representation
pending future assertions remain non-failing
CLI compatibility with evaluation/runner/evaluation-runner.js
invalid fixture shape still fails validation
```

## 7. Query Families Covered

Administrative issuances:

```text
RR 2-98
RR No. 2-98
Revenue Regulations No. 2-98
RMC 65-2012
RMC No. 65-2012
Revenue Memorandum Circular No. 65-2012
RMO 20-2013
RMO No. 20-2013
Revenue Memorandum Order No. 20-2013
RMO 24-2013
```

Statutory authorities:

```text
NIRC Sec. 57
NIRC Section 57
Section 57 of the NIRC
NIRC Sec. 58
NIRC Section 23
RA 10963
Republic Act No. 10963
TRAIN Law
RA 11534
CREATE Act
```

Court authorities:

```text
CTA Case No. 9369
CTA Case 9369
G.R. No. 153866
CIR v. Seagate
Seagate case
```

Generic guard controls:

```text
tax law
BIR issuance
court case
VAT case
withholding tax case
explain EWT
what is withholding tax
```

## 8. Expected Behavior Encoded

Exact or near-exact named authority citations encode:

```text
expectedAuthorityLookupType
expectedAuthorityFamily
expectedNamedAuthorityRecognition
expectedPromotionPolicy
expectedSourceCardPolicy
expectedGuardBehavior
notes
```

Pending runtime expectations encode that bare/named authority queries should:

```text
avoid generic GENERAL_TAX downgrade
remain eligible for authority-aware retrieval
prefer exact indexed source cards where available
avoid unrelated substitute authorities
preserve source limitation discipline when no exact source is indexed
```

## 9. Generic Guard Controls Included

Generic controls encode:

```text
expectedAuthorityLookupType: generic_query
expectedAuthorityFamily: none
expectedNamedAuthorityRecognition: false
expectedPromotionPolicy: do_not_promote_exact_authority
expectedSourceCardPolicy: do_not_fabricate_exact_source_card
expectedGuardBehavior: generic_query_guard
```

They also include pending metadata forbidding false exact promotion and substituted exact cards.

## 10. Pending / Future Expectations

All runtime behavior expectations remain pending:

```text
future_runtime_assertion
status: pending
```

This follows the Phase 6F evaluation harness convention. The patch defines desired behavior for PATCH-06H-003 without requiring the current runtime to satisfy it yet.

## 11. Local Validation Results

Focused PATCH-06H-002 test:

```text
PASS - 12 passed, 0 failed
```

Relevant adjacent suites:

```text
PASS - patch-06f-001-evaluation-runner-skeleton.test.mjs, 6 passed
PASS - patch-06f-002-authority-source-card-regression-suite.test.mjs, 8 passed
PASS - patch-06f-003-case-click-target-integrity.test.mjs, 9 passed
PASS - patch-06f-004-generic-query-guard-regression.test.mjs, 9 passed
```

Full regression gate:

```text
npm test
PASS - 10 syntax checks, 75 suites, 0 failures
```

Forbidden files guard:

```text
npm run guard:files
PASS - No protected files modified
```

## 12. Test-Only Confirmation

Confirmed:

```text
This patch is test-only.
No bare citation normalization fix was implemented.
No retrieval behavior was changed.
No reranker behavior was changed.
No authority-normalization behavior was changed.
No source-card behavior was changed.
No sourceAvailability behavior was changed.
No ask/tax/audit runtime behavior was changed.
```

## 13. Runtime Behavior Confirmation

Confirmed no runtime modules were changed.

The evaluation runner category registry was not changed; the new fixture reuses existing recognized categories and stores Phase 6H-specific labels in pending assertion metadata.

## 14. DB / Indexing / Vector / Corpus / Package / Env Confirmation

Confirmed unchanged:

```text
DB
indexing
RAG
vector store
corpus
ingestion
package.json
package-lock.json
dependencies
environment files
secrets
prompts
routes
controllers
```

## 15. Risk Assessment

Risk: Low.

Reason:

```text
The patch adds offline fixture/test coverage only.
All runtime expectations are pending future assertions.
The existing runner category registry remains unchanged.
The full regression gate and protected-file guard pass.
```

Residual risk:

```text
PATCH-06H-003 still needs to determine whether the actual fix belongs in issue classification, exact-authority detection, administrative authority aliases, authority normalization, retrieval exact lookup, or sourceAvailability bridge logic.
```

## 16. Recommended Next Task

```text
PATCH-06H-003 - Bare citation normalization fix
```

Reason:

```text
PATCH-06H-002 now defines the desired bare citation and named authority behavior as non-failing regression targets. PATCH-06H-003 can implement the narrow normalization fix against those targets.
```
