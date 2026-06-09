# PATCH-017I — FAST_DEFINITION Renderer Source-State Cleanup

## A. Patch Title

PATCH-017I — FAST_DEFINITION Renderer Source-State Cleanup

## B. Program Status Context

TINA is currently in:

**Staging Validation & Response Quality Hardening**

The retrieval architecture is no longer the active blocker.

Recent validated patches:

* PATCH-017D — EWT Authority Lock
* PATCH-017E — Compact EWT Retrieval
* PATCH-017F — Pre-Retrieval EWT Short Circuit
* PATCH-017G — Source State Synchronization
* PATCH-017H Rev 2 — Direct VAT Authority Preservation

PATCH-017H Rev 2 has been verified as SAFE TO COMMIT.

Current evidence confirms that both VAT and EWT paths now reach:

```text
AUTHORITY_FOUND
```

The remaining defect is downstream of retrieval.

## C. Problem Statement

Renderer output is inconsistent with Source Availability Engine state.

Observed example:

```text
saeStatus: AUTHORITY_FOUND
limitationRequired: false
```

But rendered answer still displays language such as:

```text
Framework knowledge — pending index verification
```

or:

```text
Source Verification Limitation
```

This is incorrect when governing indexed authorities have already been found.

## D. Root Cause Hypothesis

The likely defect is in one or more renderer/template/composer layers that still rely on stale fallback indicators, such as:

* stale `sourceAvailabilityStatus`
* stale `sourceAvailability`
* stale `limitationRequired`
* legacy framework-knowledge flag
* fallback banner state
* pending index verification template
* source limitation template

This is not a retrieval, SAE, authority-lock, or source-selection defect.

## E. Patch Objective

Ensure that when TINA has confirmed indexed authority, the renderer must not display fallback or limitation language.

When any of the following equals `AUTHORITY_FOUND`:

```text
saeStatus
sourceAvailabilityStatus
sourceAvailability
sourceAvailabilityAssignment
```

then the renderer must suppress:

```text
Framework knowledge — pending index verification
Source Verification Limitation
pending index verification
framework knowledge fallback
no indexed source limitation
related authority only limitation
retrieval limitation language
```

unless a newer explicit hard error exists.

## F. Scope

This patch is limited to the rendering / response composition layer.

Allowed areas:

* response renderer
* response composer
* answer template builder
* source limitation builder
* FAST_DEFINITION formatting logic
* displayed source-state normalization immediately before rendering

Forbidden areas:

* retrieval engine
* Source Availability Engine assignment logic
* authority lock logic
* PATCH-017D/E/F/G/H logic
* VAT bridge eligibility logic
* EWT fast path logic
* source selection ranking logic
* authority-utils.js unless strictly necessary and justified

## G. Required Behavior

### Rule 1 — AUTHORITY_FOUND Suppresses Fallback Language

If rendered context has:

```text
AUTHORITY_FOUND
```

from any authoritative source-state field, then do not render:

```text
Framework knowledge — pending index verification
```

### Rule 2 — AUTHORITY_FOUND Suppresses Source Limitation Message

If:

```text
saeStatus: AUTHORITY_FOUND
```

or equivalent normalized state exists, then:

```text
limitationRequired
```

must be treated as false at the rendering layer.

### Rule 3 — Limitation Language Allowed Only for Non-Full Authority States

Renderer limitation language may appear only when final normalized source state is one of:

```text
RELATED_AUTHORITY_ONLY
NO_INDEXED_SOURCE
RETRIEVAL_TIMEOUT
SOURCE_LOOKUP_EMPTY
```

### Rule 4 — FAST_DEFINITION Must Use Short Advisory Format

For FAST_DEFINITION answers, prefer this output structure:

```text
Direct Answer
Governing Authority
Practical Meaning
Source Basis
```

Avoid full legal-analysis format unless the user asks for legal analysis.

### Rule 5 — Do Not Downgrade AUTHORITY_FOUND

Once pre-generation or post-generation context has:

```text
AUTHORITY_FOUND
```

the renderer must not downgrade the visible answer to:

```text
RELATED_AUTHORITY_ONLY
NO_INDEXED_SOURCE
pending verification
framework knowledge
```

unless a later explicit hard retrieval error is recorded and logged.

## H. Expected Test Cases

### Test Case 1 — VAT Definition

Question:

```text
What is VAT?
```

Expected:

```text
AUTHORITY_FOUND
```

Expected source basis:

```text
NIRC Sec. 105
NIRC Sec. 106
```

Acceptable additional source cards if available:

```text
NIRC Sec. 107
NIRC Sec. 108
RR 16-2005
```

Must not display:

```text
Framework knowledge — pending index verification
Source Verification Limitation
```

### Test Case 2 — EWT Advertising

Question:

```text
Is advertising service subject to EWT?
```

Expected:

```text
AUTHORITY_FOUND
```

Expected source basis:

```text
NIRC Sec. 57
NIRC Sec. 58
```

Must not display:

```text
Framework knowledge — pending index verification
Source Verification Limitation
```

### Test Case 3 — True NO_INDEXED_SOURCE

Question:

```text
Ask a tax issue with no indexed authority available.
```

Expected:

Renderer may show limitation language.

### Test Case 4 — RELATED_AUTHORITY_ONLY

Question:

```text
Ask a tax issue where only related but non-governing authority exists.
```

Expected:

Renderer may show limitation language.

## I. Required Logs

Add or preserve concise diagnostic logs:

```text
PATCH_017I_RENDERER_SOURCE_STATE_NORMALIZED
PATCH_017I_AUTHORITY_FOUND_LIMITATION_SUPPRESSED
PATCH_017I_FAST_DEFINITION_RENDERER_APPLIED
PATCH_017I_FALLBACK_LANGUAGE_BLOCKED
```

Do not add noisy logs.

## J. Acceptance Criteria

Patch passes if:

1. VAT definition answer renders without fallback or limitation language.
2. EWT advertising answer renders without fallback or limitation language.
3. `AUTHORITY_FOUND` is preserved through final render.
4. Limitation language still appears for valid non-authority states.
5. No changes are made to retrieval, SAE, authority lock, VAT bridge, or EWT fast path logic.
6. PATCH-017D/E/F/G/H behaviors remain intact.
7. Source cards remain visible when available.
8. FAST_DEFINITION output is concise and advisory, not unnecessarily encyclopedic.

## K. Non-Goals

This patch does not attempt to fully solve:

* Estate Tax source-card resolution
* global source-card standardization
* full /ask modernization
* VAT source-card expansion beyond already retrieved sources
* source ranking redesign
* retrieval recall expansion

Those are separate future patches.

## L. Final Implementation Instruction

Implement PATCH-017I as a narrow renderer/source-state cleanup patch.

Do not reopen retrieval architecture.

Do not modify SAE assignment.

Do not modify PATCH-017D/E/F/G/H unless a direct renderer dependency requires a minimal compatibility read only.
