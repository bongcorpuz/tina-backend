# PATCH-06H-003 - Bare Citation Normalization Fix

Status: COMPLETE / LOCAL PASS

Branch: feature/source-availability-engine-v1

## 1. Objective

Implement the narrow Phase 6H fix for bare citation and named authority recognition while preserving generic-query guard discipline.

## 2. Scope

Changed files:

```text
issue-exact-authority-detector.js
tests/patch-06e-006-issue-exact-authority-detector-extraction.test.mjs
tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
PATCH-06H-003_BARE_CITATION_NORMALIZATION_FIX.md
knowledge/CURRENT_STATE.md
```

Runtime scope was limited to exact-authority detection.

## 3. Baseline Basis From PATCH-06H-001

PATCH-06H-001 identified exact-authority detection, administrative alias recognition, and issue-classification handoff as the first likely root area for bare citation defects.

It also recommended avoiding vector-store, source-card, reranker, and broad pipeline changes unless upstream exact-authority recognition was already proven correct.

## 4. Regression-Test Basis From PATCH-06H-002

PATCH-06H-002 added offline regression targets for:

```text
bare administrative citations
bare statutory citations
bare case citations
known named authority aliases
generic guard controls
```

PATCH-06H-003 converted those targets into active classifier assertions while keeping the fixture's future runtime assertions pending for later live/source-card evaluation.

## 5. Root Cause Identified

Most PATCH-06H-002 targets were already recognized as exact authorities by the classifier. The narrow unresolved detector gaps were:

```text
CTA Case 9369
CIR v. Seagate
Seagate case
```

Root cause:

```text
issue-exact-authority-detector.js required "No." for CTA Case citations.
issue-exact-authority-detector.js did not contain a narrow known Seagate alias mapping to G.R. No. 153866.
```

The parked RR 2-98 finding is now guarded by active regression assertions confirming exact-authority detection and exact-authority retrieval strategy for the bare query.

## 6. Files Changed

Runtime:

```text
issue-exact-authority-detector.js
```

Tests:

```text
tests/patch-06e-006-issue-exact-authority-detector-extraction.test.mjs
tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
```

Documentation / continuity:

```text
PATCH-06H-003_BARE_CITATION_NORMALIZATION_FIX.md
knowledge/CURRENT_STATE.md
```

## 7. Normalization Behavior Added Or Hardened

Added:

```text
isSeagateAuthorityAlias()
```

This narrowly recognizes:

```text
CIR v. Seagate
CIR v. Seagate Technology
Seagate case
```

and maps them to:

```text
G.R. No. 153866
```

Hardened CTA detection:

```text
CTA Case No. 9369 -> CTA Case No. 9369
CTA Case 9369 -> CTA Case No. 9369
```

Preserved existing canonicalization:

```text
RR 2-98 -> RR No. 2-1998
RMC 65-2012 -> RMC No. 65-2012
RMO 20-2013 -> RMO No. 20-2013
NIRC Sec. 57 -> NIRC Sec. 57
Section 57 of the NIRC -> NIRC Sec. 57
RA 10963 -> RA 10963
TRAIN Law -> RA 10963
CREATE Act -> RA 11534
G.R. No. 153866 -> G.R. No. 153866
```

## 8. Generic Guard Behavior Preserved

Active PATCH-06H-003 assertions confirm the following remain non-exact authority lookups:

```text
tax law
BIR issuance
court case
VAT case
withholding tax case
explain EWT
what is withholding tax
```

Existing generic guard suites also pass.

## 9. Authority Families Covered

Covered by active tests:

```text
Revenue Regulations
Revenue Memorandum Circulars
Revenue Memorandum Orders
NIRC sections
Republic Acts
TRAIN Law
CREATE Act
CTA division cases
Supreme Court G.R. cases
known Seagate named-case aliases
```

## 10. Tests Added Or Updated

Updated:

```text
tests/patch-06e-006-issue-exact-authority-detector-extraction.test.mjs
```

Added active checks for:

```text
isSeagateAuthorityAlias()
CTA Case 9369
CIR v. Seagate
Seagate case
VAT case not treated as Seagate
```

Updated:

```text
tests/patch-06h-002-bare-citation-normalization-regression.test.mjs
```

Added active classifier assertions for all PATCH-06H-002 exact/named authority targets and active generic guard assertions.

## 11. Local Validation Results

Focused tests:

```text
PASS - tests/patch-06e-006-issue-exact-authority-detector-extraction.test.mjs
PASS - tests/patch-06h-002-bare-citation-normalization-regression.test.mjs, 14 passed
```

Adjacent tests:

```text
PASS - tests/patch-027m-exact-admin-query-shape.test.mjs, 84 passed
PASS - tests/patch-030a-exact-jurisprudence-authority-integrity.test.mjs, 22 passed
PASS - tests/patch-06f-002-authority-source-card-regression-suite.test.mjs, 8 passed
PASS - tests/patch-06f-003-case-click-target-integrity.test.mjs, 9 passed
PASS - tests/patch-06f-004-generic-query-guard-regression.test.mjs, 9 passed
PASS - tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs, 5 passed
PASS - tests/patch-034f-1-authority-alias-registry-extraction.test.mjs, 12 passed
```

Full gate:

```text
npm test
PASS - 10 syntax checks, 75 suites, 0 failures
```

Protected files guard:

```text
npm run guard:files
PASS - No protected files modified
```

## 12. DB / Indexing / Vector / Corpus / Package / Env Confirmation

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

## 13. SourceAvailability Function Movement Confirmation

Confirmed:

```text
classifySourceAvailability was not moved.
computeSourceAvailability was not moved.
source-visibility-engine.js was not made a classifier destination.
pipeline.js was not changed.
```

## 14. External Dependency Confirmation

Confirmed:

```text
No new external dependencies were added.
No zod/langfuse/cohere-ai/zustand/Vercel AI SDK/Terraform/OpenTofu/Honeycomb/Gemini/GLM/DeepSeek/Copilot/Apify/n8n/B2 ingestion work was added.
```

## 15. Risk Assessment

Risk: Low.

Reason:

```text
Runtime change is confined to issue-exact-authority-detector.js.
New patterns are narrow and explicit.
Generic guard queries remain non-exact.
No retrieval/reranker/source-card/sourceAvailability code changed.
Full regression and protected-file gates pass.
```

Residual risk:

```text
Source-card outcomes for these bare/named lookups still depend on retrieval and indexed-source behavior. That should be evaluated next rather than changed in this patch.
```

## 16. Recommended Next Task

```text
PATCH-06H-004 - Retrieval / reranker baseline evaluation report
```

Reason:

```text
After exact-authority normalization is fixed, Phase 6H should evaluate retrieval/reranker baseline behavior before considering reranker changes, cohere-ai experiments, or additional decomposition.
```
