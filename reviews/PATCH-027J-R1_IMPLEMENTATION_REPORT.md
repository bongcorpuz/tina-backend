# PATCH-027J-R1 Implementation Report

Date: 2026-06-17  
Repository: `tina-backend`  
Branch: `feature/source-availability-engine-v1`  
Scope: local implementation and validation only. No deployment, push, SQL, metadata, retrieval, or source-card changes were made.

## 1. Verdict

PATCH-027J-R1 implementation is functionally validated locally.

The five exact administrative-authority lookup queries now return `AUTHORITY_FOUND` through the local pipeline:

- `Explain RR 2-98`
- `Explain RR 12-2018`
- `Explain RMC 65-2012`
- `What is RMO 20-2013?`
- `Explain RMO 24-2013`

Full regression suite passed.

Protected-file guard failed because this patch intentionally modifies protected file `authority-utils.js`. Commit should wait for explicit review/authorization.

## 2. Files Changed

Modified:

- `authority-utils.js`

Added:

- `tests/patch-027j-r1-exact-admin-authority-governing.test.mjs`
- `reviews/PATCH-027J-R1_IMPLEMENTATION_REPORT.md`

No changes were made to:

- `retrieval-engine.js`
- `issue-classification-engine.js`
- source-card logic
- metadata / SQL
- deployment configuration

## 3. Code Change

Implemented the approved narrow fix in:

```text
authority-utils.js
docOnSpecificAuthorityPlan()
```

The patch adds module-private helpers:

```js
EXACT_ADMINISTRATIVE_AUTHORITY_TYPES
administrativeAuthorityKey()
controllingAdministrativeAuthorityKeys()
docAdministrativeAuthorityKeys()
hasExactAuthorityRetrievalSignal()
hasExactAdministrativeAuthorityContextVeto()
isExactAdministrativeAuthorityPlanMatch()
```

The branch added inside `docOnSpecificAuthorityPlan()`:

```js
const tier = Number(doc.authorityMatchTier ?? match.authorityMatchTier ?? 4);
if (tier <= 2) return true;
if (isExactAdministrativeAuthorityPlanMatch(doc, issueClassification, match)) return true;
```

This is not a blanket `authorityMatchTier <= 3` rule.

The exact administrative branch requires:

- authority type is `RR`, `RMC`, `RMO`, or `RAMO`;
- retrieval/classification has an exact/target signal or Layer 1/2 exact layer;
- the candidate exposes a canonical administrative authority key;
- the controlling plan exposes the same canonical administrative authority key;
- query context is not vetoed as jurisprudence / court-decision / cite-only-NIRC.

`directlyGovernsIssue()` now passes the full issue classification into `docOnSpecificAuthorityPlan()` so the private gate can see the full controlling-authority plan and safe context flags:

```js
if (!docOnSpecificAuthorityPlan(doc, issueClassification)) return false;
```

## 4. Why This Preserves Authority Lock

The change only affects whether an already-retrieved exact administrative candidate satisfies the specific-authority plan.

It does not:

- create fallback authority;
- alter retrieval;
- alter source-card selection;
- alter metadata;
- bypass parse/index checks;
- bypass `sourceMaterialTermsMatchAuthority()`;
- bypass `getAuthorityRole()`;
- bypass SAE;
- bypass PATCH-019A / PATCH-024C citation gates.

The candidate must still be indexed, parsed, exact-key matched, and semantically acceptable before it can become `AUTHORITY_FOUND`.

## 5. Regression Tests Added

New suite:

```text
tests/patch-027j-r1-exact-admin-authority-governing.test.mjs
```

Coverage:

- exact RR/RMC/RMO lookup candidates become `GOVERNING`;
- tier 3 RR/RMC candidates are accepted only with canonical key intersection;
- tier 4 Layer 1 RMO candidates are accepted only with canonical key intersection;
- wrong-number administrative document does not become governing;
- non-lookup administrative reference does not become governing;
- generic BIR issuance plan does not promote a numbered RR;
- metadata variants normalize correctly;
- withholding, NIRC Sec. 57, VAT, TRAIN, CREATE controls remain intact;
- false-positive controls remain non-governing through this branch.

Targeted result:

```text
PATCH-027J-R1 42 passed 0 failed
```

## 6. Full Test Results

Command:

```text
npm test
```

Result:

```text
Syntax checks: 10 run, 0 failed
Test suites:   30 run, 0 failed
GATE PASSED
```

## 7. Protected-File Guard Result

Command:

```text
npm run guard:files
```

Result:

```text
FAIL: protected files modified:
  [M] authority-utils.js
```

Interpretation:

This is expected for PATCH-027J-R1 because the approved target file is `authority-utils.js`, which is protected. Do not commit until the protected-file change is explicitly approved.

## 8. Local Pipeline Validation

Validation method:

- direct local `runPipeline()` execution;
- hook `/ask`;
- local `.env` credentials;
- model `gpt-4o-mini`;
- no deployment.

Local server `/ask` route was not used because local `server.js` startup fails before serving routes due to:

```text
GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON.
```

No environment/config change was made.

### Matrix

| ID | Query | sourceAvailability | Retrieved | Cards | First card | RELATED? |
|---|---|---|---:|---:|---|---|
| Q1 | Explain RR 2-98 | `AUTHORITY_FOUND` | 6 | 4 | `Revenue Regulations` | No |
| Q2 | Explain RR 12-2018 | `AUTHORITY_FOUND` | 12 | 1 | `RR No. 12-2018` | No |
| Q3 | Explain RMC 65-2012 | `AUTHORITY_FOUND` | 12 | 1 | `RMC No. 65-2012` | No |
| Q4 | What is RMO 20-2013? | `AUTHORITY_FOUND` | 12 | 1 | `RMO No. 20-2013` | No |
| Q5 | Explain RMO 24-2013 | `AUTHORITY_FOUND` | 12 | 1 | `RMO No. 24-2013` | No |
| Q6 | What is withholding tax? | `AUTHORITY_FOUND` | 6 | 4 | `Revenue Regulations` | No |
| Q7 | Explain NIRC Section 57 | `AUTHORITY_FOUND` | 12 | 1 | `NIRC Sec. 57` | No |
| Q8 | Explain VAT | `AUTHORITY_FOUND` | 12 | 1 | `RR No. 16-2005` | No |
| Q9 | Explain TRAIN Law | `AUTHORITY_FOUND` | 12 | 2 | `RA 10963` | No |
| Q10 | Explain CREATE Act | `AUTHORITY_FOUND` | 12 | 1 | `RA No. 11534` | No |
| Q11 | Explain RR 2-98 in relation to VAT refund jurisprudence | `AUTHORITY_FOUND` | 5 | 3 | `RR 1-2017` | No |
| Q12 | Is RMO 20-2013 a Supreme Court decision? | `RELATED_AUTHORITY_ONLY` | 5 | 1 | `CTA Case No. 9711` | Yes |
| Q13 | Explain RMC 65-2012 and cite only the NIRC | `RELATED_AUTHORITY_ONLY` | 12 | 0 | none | Yes |
| Q14 | What is the penalty under NIRC Section 248? | `AUTHORITY_FOUND` | 12 | 1 | `NIRC Sec. 248` | No |

Notes:

- Q1-Q5 meet the target behavior: exact administrative lookup queries moved to `AUTHORITY_FOUND`.
- Q11 returns `AUTHORITY_FOUND` because other VAT refund authorities govern (`RR 1-2017`, `NIRC Sec. 112` path), not because the PATCH-027J exact-admin branch promoted RR 2-98. The unit false-positive test confirms the exact RR 2-98 branch is vetoed for jurisprudence context.
- Q12/Q13 remain non-governing for the exact administrative branch.
- Q14 confirms NIRC section behavior is preserved.

## 9. Remaining Risk

The main residual risk is protected-file governance, not test behavior.

Runtime risk is controlled by:

- exact canonical key intersection;
- controlling-authority-only planned key;
- explicit exact retrieval signal;
- context vetoes for jurisprudence/court/cite-only-NIRC shapes;
- unchanged semantic, parsed, indexed, and SAE gates.

## 10. Commit Recommendation

Do not commit automatically.

Recommended next step:

1. Review protected-file change in `authority-utils.js`.
2. If approved, commit with the new test and report.
3. Then deploy/validate staging separately.

---

# PATCH-027J-R2 Hardening Addendum

Date: 2026-06-17  
Scope: pre-commit hardening after independent release-gate review.

## R2 Runtime Hardening

R2 tightened the exact administrative authority promotion branch in `authority-utils.js`:

- `targetAuthorityMatch === true` alone no longer qualifies as an exact retrieval signal.
- Exact administrative promotion now requires `exactAuthorityMatch === true` or Layer 1/Layer 2 exact retrieval signal.
- Canonical administrative document keys are no longer derived from broad `title`, `source`, `path`, `documentTitle`, or metadata path/source fields.
- Promotion still requires planned controlling-authority key intersection with the candidate's primary authority identity.

No changes were made to retrieval, metadata, SAE, source-card selection, answer generation, or PATCH-024C logic.

## R2 Tests Added

Updated:

```text
tests/patch-027j-r1-exact-admin-authority-governing.test.mjs
```

Additional coverage:

- RAMO positive exact-authority case;
- RAMO mismatch negative case;
- `targetAuthorityMatch`-only negative case;
- path/title/source-only contamination negative case;
- unindexed exact candidate negative case;
- parse-failed exact candidate negative case;
- supporting-authorities-only negative case;
- BIR Ruling out-of-scope branch-isolation case.

Direct targeted result:

```text
PATCH-027J-R1 52 passed 0 failed
```

## R2 Validation Results

Targeted command:

```text
npm test -- tests/patch-027j-r1-exact-admin-authority-governing.test.mjs
```

Result:

```text
Syntax checks: 10 run, 0 failed
Test suites:   30 run, 0 failed
GATE PASSED
```

Full command:

```text
npm test
```

Result:

```text
Syntax checks: 10 run, 0 failed
Test suites:   30 run, 0 failed
GATE PASSED
```

Protected-file guard:

```text
npm run guard:files
```

Result:

```text
FAIL: protected files modified:
  [M] authority-utils.js
```

Interpretation: still expected. Commit requires explicit protected-file approval.

## R2 Local Pipeline Matrix

Validation method:

- direct local `runPipeline()`;
- local `.env` credentials for Supabase/OpenAI;
- hook `/ask`;
- model `gpt-4o-mini`;
- no deployment, push, SQL, metadata, retrieval, SAE, or source-card changes.

| Query | sourceAvailability | Exact authority | Retrieved | Cards | First card | RELATED? |
|---|---|---|---:|---:|---|---|
| Explain RR 2-98 | `AUTHORITY_FOUND` | `RR No. 2-1998` | 6 | 4 | `Revenue Regulations` | No |
| Explain RR 12-2018 | `AUTHORITY_FOUND` | `RR No. 12-2018` | 12 | 1 | `RR No. 12-2018` | No |
| Explain RMC 65-2012 | `AUTHORITY_FOUND` | `RMC No. 65-2012` | 12 | 1 | `RMC No. 65-2012` | No |
| What is RMO 20-2013? | `AUTHORITY_FOUND` | `RMO No. 20-2013` | 12 | 1 | `RMO No. 20-2013` | No |
| Explain RMO 24-2013 | `AUTHORITY_FOUND` | `RMO No. 24-2013` | 12 | 1 | `RMO No. 24-2013` | No |
| Explain RAMO 1-2020 | `NO_INDEXED_SOURCE` | `RAMO No. 1-2020` | 0 | 0 | none | No |
| Explain RR 2-99 | `NO_INDEXED_SOURCE` | `RR No. 2-1999` | 0 | 0 | none | No |
| Explain RMC 65-2012 and cite only the NIRC | `RELATED_AUTHORITY_ONLY` | `RMC No. 65-2012` | 12 | 0 | none | Yes |
| Explain BIR Ruling No. 123-2020 | `RELATED_AUTHORITY_ONLY` | none | 12 | 0 | none | Yes |
| Is RMO 20-2013 a Supreme Court decision? | `RELATED_AUTHORITY_ONLY` | `RMO No. 20-2013` | 12 | 1 | `CTA Case No. 9711` | Yes |

RAMO live pipeline coverage could not prove `AUTHORITY_FOUND` because the tested RAMO authority returned `NO_INDEXED_SOURCE`; RAMO exact-promotion behavior is covered deterministically in the unit regression suite.

## R2 Commit Readiness

PATCH-027J-R1 is now hardened against the independent review's edge-case concerns and is functionally commit-ready after explicit protected-file approval for `authority-utils.js`.
