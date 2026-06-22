# Current State

## TINA Continuity Status

Current phase: **Phase 6B — Controlled Decomposition and Registry Extraction**

Current backend latest pushed commit:

```text
8adba2a PATCH-034H Phase 6B stabilization gate
```

Last behavior-validated staging runtime commit:

```text
60bbc642a47bbacd3c825d12056c8a0b32c8af2f
```

Current backend branch:

```text
feature/source-availability-engine-v1
```

Backend service:

```text
tina-backend-staging
```

Environment:

```text
staging
```

Current staging status:

```text
/health: ok
indexingRunning: false
vector store: 5,346 chunks / 102 sources
```

Current working state:

```text
PATCH-034H COMPLETE / PUSHED
Phase 6B Stabilization Gate: PASS WITH KNOWN BACKLOG
Next step: choose next approved work item; do not start TRAIN Law / RA 10963 without separate approval
```

---

## Governance Rule

TINA development must follow:

```text
LIVE EVIDENCE > THEORY > PATCH
```

Required backend workflow:

```text
1. UI or live evidence
2. Render/staging logs where available
3. Investigation
4. Root-cause classification
5. Patch approval
6. Narrow implementation
7. Local tests
8. Commit
9. Push
10. Staging validation
11. Only then proceed
```

Do not patch from assumptions.

---

## Work Owner Rule

### Codex

Use **Codex** for:

```text
narrow implementation
small extraction patches
test writing
local validation
commits
pushes
staging validation
diagnostic runs
repo verification
```

Codex is the primary implementation worker for Phase 6B.

### Claude Code

Use **Claude Code** for:

```text
broad architecture planning
large refactor strategy
pipeline decomposition design
phase planning
risk analysis
module boundary design
future system architecture
```

Claude Code is the architecture/refactor planning owner, especially before deep `pipeline.js`, `source-authority-selector.js`, `authority-utils.js`, or route/controller decomposition.

### Gemini

Use **Gemini** only as optional:

```text
second-opinion reviewer
external reasoning comparator
research reviewer
architecture critique
```

Gemini is not the primary implementer or governance owner.

---

# SAE V1 Staging Release-Gate

## SAE V1 STAGING RELEASE-GATE: PASS

Backend commit:

```text
bdf2445518f7968440c64af1c705b261607e2487
```

Service:

```text
tina-backend-staging
```

Environment:

```text
staging
```

Matrix:

```text
7/7 PASS
```

Validated queries:

1. `What does RR 2-98 provide on expanded withholding tax?`
   Result: `AUTHORITY_FOUND`, RR 2-98, 4 cards — PASS

2. `What does RR 12-2018 provide on estate tax?`
   Result: `AUTHORITY_FOUND`, RR No. 12-2018, 1 card — PASS

3. `What is RMC 65-2012?`
   Result: `AUTHORITY_FOUND`, RMC No. 65-2012, 1 card — PASS

4. `What is RMO 20-2013?`
   Result: `AUTHORITY_FOUND`, RMO No. 20-2013, 1 card — PASS

5. `What is RMO 24-2013?`
   Result: `AUTHORITY_FOUND`, RMO No. 24-2013, 1 card — PASS

6. `What is withholding tax?`
   Result: `RELATED_AUTHORITY_ONLY`, 0 cards — PASS

7. `Are there jurisprudence cases on withholding tax?`
   Result: `RELATED_AUTHORITY_ONLY`, CTA Case No. 9711, 1 card — PASS

SAE V1 status:

```text
RELEASE-GATE APPROVED
```

TINA v1 status:

```text
AUTHORITY-SAFE CANDIDATE
```

Completed commits:

```text
66659c8 PATCH-027J-R2
2a322ab PATCH-027M
d500d92 PATCH-027N
bdf2445 SAE V1 local release-gate validation report
2c89a10 SAE V1 staging release-gate approval docs
```

---

# Completed Phase Status

## Phase 1 — Core Tax Assistant

Status:

```text
COMPLETE
```

## Phase 2 — Retrieval Foundation

Status:

```text
COMPLETE
```

## Phase 3 — Authority-Aware Retrieval

Status:

```text
COMPLETE
```

## Phase 4 — Retrieval Integrity and Authority Discipline

Status:

```text
COMPLETE
```

## Phase 5 — Source Availability Engine V1

Status:

```text
COMPLETE / STAGING PASS
```

TINA reached:

```text
Authority-Safe Candidate
```

## Phase 6 — NIRC Metadata and Authority Normalization

Status:

```text
STABILIZED
```

## Phase 6B — Controlled Decomposition and Registry Extraction

Status:

```text
ACTIVE
```

Current result:

```text
PATCH-034A through PATCH-034G are COMPLETE / STAGING PASS
PATCH-034H Phase 6B Stabilization Gate is COMPLETE / PUSHED
Phase 6B extracted-module behavior is stable
```

---

# Phase 6B Completed Patches

## PATCH-034A — Source Card Engine Pure Helpers

Work owner:

```text
Codex
```

Status:

```text
COMPLETE / STAGING PASS
```

Created/extracted:

```text
source-card-engine.js
```

Purpose:

```text
Extract pure source-card helper functions from pipeline.js.
```

Validated:

```text
VAT cards
RR 2-98 dedupe/clickability
CTA 9369 no wrong-link regression
BIR definition
taxpayer/NIRC cards
```

---

## PATCH-034B — Indexed Source-Card Hydration

Work owner:

```text
Codex
```

Status:

```text
COMPLETE / STAGING PASS
```

Purpose:

```text
Extract indexed source-card hydration helper.
```

Key behavior preserved:

```text
resolveIndexedSourceCardTarget()
exactAuthoritySearch payload behavior
source-card URL hydration
```

---

## PATCH-034C — Authority Restoration Matching Helpers

Work owner:

```text
Codex
```

Status:

```text
COMPLETE / STAGING PASS
```

Created/extracted:

```text
authority-restoration-engine.js
```

Purpose:

```text
Extract authority restoration candidate matching helpers.
```

Kept local in `pipeline.js`:

```text
PATCH-017K restoration coordinator
async indexed lookup/cache
final source-card merge behavior
```

---

## PATCH-034D — Source Intent Registry

Work owner:

```text
Codex
```

Status:

```text
COMPLETE / STAGING PASS
```

Created/extracted:

```text
source-intent-registry.js
```

Purpose:

```text
Extract source intent/source inventory detection helpers.
```

Validated:

```text
SOURCE_LOOKUP preserved
income-source legal terms do not accidentally trigger source inventory
NIRC Sec. 23 source lookup preserved
```

---

## PATCH-034E — Taxpayer Definition Registry

Work owner:

```text
Codex
```

Commit:

```text
332db5f32e71a9ac48792e6272ea04e7f7480fca
```

Status:

```text
COMPLETE / STAGING PASS
```

Created/extracted:

```text
taxpayer-definition-registry.js
```

Exports:

```text
RESIDENT_CITIZEN_INCOME_SCOPE
TAXPAYER_DEFINITION
hasTaxOrNircContext
isResidentCitizenIncomeScopeQuery
isTaxpayerDefinitionQuery
```

Validated:

```text
NIRC Sec. 22 taxpayer definitions
NIRC Sec. 23 resident citizen income-scope
bare resident citizen / nonresident alien clarification
VAT
BIR
RR 2-98
CTA 9369
NIRC Sec. 23 source lookup
```

---

## PATCH-034F-1 — Classifier-Side Authority Alias Registry

Work owner:

```text
Codex
```

Commit:

```text
f04c8c30a9b122633e99a1ea1b7002e3397a1220
```

Status:

```text
COMPLETE / STAGING PASS
```

Created/extracted:

```text
authority-alias-registry.js
```

Exports:

```text
ADMINISTRATIVE_AUTHORITY_TYPES
EXACT_ADMINISTRATIVE_AUTHORITY_TYPES
normalizeAdminAuthorityYear
normalizeAdministrativeAuthorityReference
detectAdministrativeAuthorityReference
isExactAdministrativeAuthorityLookup
```

Kept local in `issue-classification-engine.js`:

```text
detectExactAuthority() compatibility wrapper/export
buildAuthorities()
detectRetrievalStrategy()
detectResponseMode()
detectOrchestrationMode()
classifyTaxIssue() execution order
CREATE/TRAIN, RA, NIRC, G.R., CTA handling
BIR ruling exclusion/promotion behavior
```

Validated:

```text
RR 2-98
RR 2-1998
RR No. 2-1998
Revenue Regulations No. 2-1998
RMC 65-2012
Revenue Memorandum Circular No. 65-2012
RMO 20-2013
Revenue Memorandum Order No. 20-2013
RR 12-2018
BIR Ruling exclusion
CTA 9369
VAT
taxpayer under NIRC
```

---

## PATCH-034F-2 — Vector-Side Authority Reference Registry

Work owner:

```text
Codex
```

Commit:

```text
8c6d4ce7c70baf8a26bffa102c8f22fc15df91ff
```

Status:

```text
COMPLETE / STAGING PASS
```

Created/extracted:

```text
vector-authority-reference-registry.js
```

Exports:

```text
buildAdminIssuanceYearLookupVariants
buildNormalizedRefVariants
isRecognizableAuthorityReference
```

Dependency handling:

```text
buildNormalizedRefVariants uses dependency injection for normalizeLegalReference.
vector-store.js keeps a local wrapper calling:
buildRegistryNormalizedRefVariants(terms, { normalizeLegalReference })
```

Kept local in `vector-store.js`:

```text
exactAuthoritySearch()
fastRefLookup()
fastRefLookupByExplicitAuthority()
fastAuthorityReferenceLookup()
Supabase/query logic
sorting/dedup/scoring/suppression
source-card hydration
URL behavior
searchIndexedSources() order
```

Validated:

```text
RR/RMC/RMO variants
RR 2-1998 to RR 2-98 lookup variants
RR 16-2005 VAT restoration
NIRC Sec. 23 source lookup
CTA 9369 no wrong-link regression
BIR Ruling no accidental admin exact lookup
G.R./RA no admin-year conversion
```

---

## PATCH-034G — Doctrine Authority Map Extraction

Work owner:

```text
Codex
```

Commit:

```text
60bbc642a47bbacd3c825d12056c8a0b32c8af2f
```

Status:

```text
COMPLETE / STAGING PASS
```

Created/extracted:

```text
doctrine-authority-map.js
```

Exports only:

```text
DEFINITION_AUTHORITY_MAP
DOMAIN_DETECTORS
ISSUE_SPECIFIC_TARGETS
```

Kept local in `issue-classification-engine.js`:

```text
detectSubIssue()
detectExactAuthority()
getDefinitionAuthorityFor()
buildAuthorities()
detectRetrievalStrategy()
detectResponseMode()
detectOrchestrationMode()
classifyTaxIssue()
CREATE/TRAIN alias helpers
EWT bridge logic
VAT specialized guard logic
exact authority override logic
```

Validated:

```text
VAT maps preserved
BIR definition map preserved
taxpayer NIRC Sec. 22 preserved
resident citizen NIRC Sec. 23 preserved
EWT/WHT NIRC Sec. 57/58 + RR 2-98 preserved
RR exact behavior preserved
BIR Ruling exclusion preserved
CTA 9369 preserved
CREATE Act preserved
NIRC Sec. 23 source lookup preserved
```

---

## PATCH-034H — Phase 6B Stabilization Gate

Work owner:

```text
Codex
```

Commit:

```text
8adba2a PATCH-034H Phase 6B stabilization gate
```

Status:

```text
COMPLETE / PUSHED
PASS WITH KNOWN BACKLOG
```

Report:

```text
PATCH-034H_PHASE-6B_STABILIZATION_GATE.md
```

Purpose:

```text
Run a complete local and staging regression matrix across all Phase 6B extracted modules before any new development.
```

Validated:

```text
source-card-engine.js
authority-restoration-engine.js
source-intent-registry.js
taxpayer-definition-registry.js
authority-alias-registry.js
vector-authority-reference-registry.js
doctrine-authority-map.js
```

Local regression:

```text
npm test
Syntax checks: 10 run, 0 failed
Test suites: 56 run, 0 failed
GATE PASSED
```

Staging validation:

```text
/health: ok
commitSha: 60bbc642a47bbacd3c825d12056c8a0b32c8af2f
indexingRunning: false
vector store: 5,346 chunks / 102 sources
```

Matrix result:

```text
VAT source-card behavior: PASS
BIR definition behavior: PASS
taxpayer definition under NIRC Sec. 22: PASS
resident citizen income-scope under NIRC Sec. 23: PASS
EWT/WHT behavior under NIRC Sec. 57 and Sec. 58: PASS
RR 2-98 exact authority behavior: PASS
RR/RMC/RMO alias variants: PASS
BIR Ruling exclusion behavior: PASS
CTA Case No. 9369 source-card correctness and click target: PASS
NIRC Sec. 23 source lookup: PASS
CREATE Act / RA 11534 behavior: PASS
TRAIN Law / RA 10963: PASS WITH KNOWN BACKLOG
```

Failure classification:

```text
Phase 6B regression: none
Pre-existing backlog: TRAIN Law / RA 10963 indexed-source alias/retrieval gap
Staging/environment issue: none
Test/query issue: initial over-specific CTA 9369 VAT-refund phrasing missed the exact case-card path
```

---

# Current Extracted Modules

The following extracted modules now exist:

```text
source-card-engine.js
authority-restoration-engine.js
source-intent-registry.js
taxpayer-definition-registry.js
authority-alias-registry.js
vector-authority-reference-registry.js
doctrine-authority-map.js
```

---

# Known Backlog

## TRAIN Law / RA 10963 Retrieval Timeout

Status:

```text
Pre-existing backlog
Not a PATCH-034G or PATCH-034H regression
```

Observed:

```text
TRAIN Law repeatedly returned RETRIEVAL_TIMEOUT / STANDARD_TAX.
```

Diagnosis:

```text
TRAIN Law maps correctly to RA 10963.
RA 10963 exactAuthoritySearch returns 0 rows.
normalizedCitationSearch for RA 10963 returns 0 rows.
normalized_reference = RA 10963 returns 0 rows.
```

But the source exists:

```text
01-tax-code/nirc-1997-ra-10963-(bir).pdf
```

Problem:

```text
Rows are normalized as NIRC sections, not RA 10963.
```

CREATE works because:

```text
CREATE Act maps to RA 11534.
RA 11534 is indexed as RA 11534.
Exact lookup succeeds.
```

Backlog fix options:

```text
1. Metadata repair: add RA 10963 alias to the indexed NIRC/Tax Code source.
2. Retrieval bridge: if exactAuthority is RA 10963 and exact lookup misses, bridge to NIRC 1997 / TRAIN-amended Tax Code source.
3. Source alias registry: map TRAIN Law / RA 10963 to indexed NIRC 1997 RA 10963 source without broad semantic fallback.
```

Do not mix this with Phase 6B decomposition unless separately approved.

---

# Future JS Decomposition Candidates

## issue-classification-engine.js

Priority:

```text
High
```

Already decomposed through:

```text
source-intent-registry.js
taxpayer-definition-registry.js
authority-alias-registry.js
doctrine-authority-map.js
```

Future possible extractions:

```text
response-mode registry
retrieval-strategy registry
classification helper modules
subIssue routing modules
```

Timing:

```text
Only after Phase 6B Stabilization Gate.
```

---

## vector-store.js

Priority:

```text
Medium
```

Already decomposed through:

```text
vector-authority-reference-registry.js
```

Future possible extractions:

```text
reference-normalization-engine.js
authority-lookup-engine.js
retrieval-ranking-engine.js
embedding-search-engine.js
```

Timing:

```text
Only after vector helper extraction remains stable.
Avoid DB/query extraction until timeout/scoring/fallback risks are better isolated.
```

---

## source-authority-selector.js

Priority:

```text
Later / high-risk
```

Reason:

```text
Controls SAS/DSF/source card selection/authority tiers.
Past bugs came from stripped fields like excerpt, authorityMatchTier, normalizedReference.
```

Timing:

```text
After SAS/DSF/source-card stabilization.
Use Claude Code for architecture first, then Codex for narrow patches.
```

---

## authority-utils.js

Priority:

```text
Later / medium-high risk
```

Reason:

```text
Authority role logic, exact admin promotion, controlling/supporting decisions.
```

Timing:

```text
After role/promotion behavior is fully mapped and protected by tests.
```

---

## pipeline.js

Priority:

```text
Major orchestration / later
```

Reason:

```text
Controls orchestration, retrieval layers, timeout races, source-card restoration, diagnostics, answer generation, and state transitions.
```

Timing:

```text
Do not deeply decompose pipeline.js yet.
Do it only after Phase 6B Stabilization Gate and after registry/helper extractions are proven stable.
```

Work owner split:

```text
Claude Code for decomposition plan.
Codex for narrow implementation patches.
```

---

## ask-handler.js or route/controller equivalent

Priority:

```text
Product layer / later
```

Timing:

```text
When implementing streaming, response tiers, caching, memory, user/session orchestration.
```

Likely phase:

```text
Phase 7 or Phase 8
```

---

## services/philippine-tax-domain-boundary.js

Priority:

```text
Sensitive boundary layer / later
```

Reason:

```text
Controls clarify/reject/answer behavior.
High risk if changed too early.
```

Timing:

```text
After classifier and authority layers are stable.
```

---

# Immediate Next Step

The next step is not another extraction.

Phase 6B stabilization has passed.

Next candidate work items, subject to explicit selection/approval:

```text
1. TRAIN Law / RA 10963 backlog fix
2. response-mode / retrieval-strategy registry investigation
3. source-authority-selector.js investigation
4. pipeline.js deeper decomposition planning
```

Current recommended hygiene posture:

```text
Do not start TRAIN Law / RA 10963 work yet.
Do not start another extraction yet.
Choose and approve the next work item first.
```

Completed gate:

```text
PATCH-034H Phase 6B Stabilization Gate
PASS WITH KNOWN BACKLOG
```

Required validation coverage:

```text
source-card behavior
authority restoration
source intent
taxpayer definitions
authority aliases
vector authority variants
doctrine maps
VAT
BIR
taxpayer Sec. 22
resident citizen Sec. 23
EWT/WHT Sec. 57/58 + RR 2-98
RR/RMC/RMO aliases
BIR Ruling exclusion
CTA 9369
NIRC source lookup
CREATE Act
TRAIN Law known backlog classification
```

---

# Strategic Direction

TINA is moving from:

```text
single large tax chatbot backend
```

toward:

```text
Philippine Tax Operating System
```

Long-term direction:

```text
Philippine tax research
authority-grounded legal/tax answers
BIR/SEC/LGU/PEZA/BOI/Customs compliance intelligence
document-aware advisory
regulatory monitoring
filing/preparation workflows
case/jurisprudence intelligence
client/entity memory
professional-grade tax/legal operating workflows
```

Current objective:

```text
stability, authority safety, source-card correctness, and clean backend architecture.
```

---

# Continuity Instruction for New Chat

Continue TINA development from the latest continuity state.

Current phase:

```text
Phase 6B — Controlled Decomposition and Registry Extraction
```

Current latest pushed commit:

```text
8adba2a PATCH-034H Phase 6B stabilization gate
```

Last behavior-validated staging runtime commit:

```text
60bbc642a47bbacd3c825d12056c8a0b32c8af2f
```

Current status:

```text
PATCH-034H COMPLETE / PUSHED
Phase 6B Stabilization Gate: PASS WITH KNOWN BACKLOG
Next step: choose next approved work item
```

Work owner rules:

```text
Codex for narrow implementation, diagnostics, tests, commits, staging validation.
Claude Code for broad architecture/refactor planning.
Gemini only for optional outside review, not primary implementation.
```

Important backlog:

```text
TRAIN Law / RA 10963 retrieval/indexing gap is pre-existing and not a PATCH-034G or PATCH-034H regression.
RA 10963 exact lookup misses because the source exists as nirc-1997-ra-10963-(bir).pdf but rows are normalized as NIRC sections, not RA 10963.
```
