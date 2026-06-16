# PATCH-027B-R3 — Execution Results

**Date:** 2026-06-16
**Repository:** tina-backend
**Branch:** feature/source-availability-engine-v1
**Target:** Supabase `public.tina_vector_store`
**Executed package:** `PATCH-027B-R3_SQL_PACKAGE_REV1.md` for `01`–`05`; `PATCH-027B-R3_SQL_PACKAGE_REV2.md` for `06`–`09` (jsonb-safe alias operations, per the schema correction triggered by the first failed execution attempt).
**Provenance note:** Execution was performed manually and sequentially outside this session (no DB connection, MCP server, or credentials are available in this environment). The results below are as reported back to this session and have not been independently re-queried or re-verified by the assistant. They are recorded here as given.

---

## 1. Section Execution Status

| Step | File | Executed? |
|---|---|---|
| 1 | `01_scope_audit.sql` (REV1) | Yes |
| 2 | `02_backup.sql` (REV1) | Yes |
| 3 | `03_verify_backup.sql` (REV1) | Yes |
| 4 | `05_collision_audit.sql` (REV1) | Yes |
| 5 | `06_updates.sql` (REV2 — jsonb-safe) | Yes |
| 6 | `07_verification_after.sql` (REV2 — jsonb-safe) | Yes |
| 7 | `08_control_group_check.sql` (REV2) | Yes |
| 8 | `09_rollback.sql` (REV1/REV2) | **Not executed** — not triggered, no rollback condition met |

`04_verification_before.sql` is a read-only informational snapshot step in the package's documented sequence; no separate pass/fail result for it was reported and none is recorded here beyond its role as the source of the control-group pre-update baseline referenced in Section 2 below.

---

## 2. Pre-Update Gate Results

| Gate | Required | Reported | Result |
|---|---|---|---|
| `01_scope_audit.sql` scope match | 30 sources, 399 chunks | source_count = 30, total_chunks = 399 | **PASS** |
| `02_backup.sql` completed | backup created without error | PASS | **PASS** |
| Backup row count (`03_verify_backup.sql`) | 399 | 399 | **PASS** |
| Distinct sources backed up | 30 | 30 | **PASS** |
| Backup mismatch (live vs. backup) | 0 rows | 0 rows | **PASS** |
| Control-group backup populated | non-zero | 1,767 rows | **PASS** |
| Control-group pre-update mismatch | 0 rows | 0 rows | **PASS** |
| `05_collision_audit.sql` | 0 rows (both queries) | PASS, 0 rows | **PASS** |

**All seven pre-update gates passed.** Per the package's fixed execution order and the prior REV2 dependency note (jsonb-typed backup tables required before `06`–`09` could be valid), the control-group backup row count of 1,767 confirms the backup tables were created/repopulated with the corrected `jsonb` column type before `06_updates.sql` ran — consistent with `06` executing successfully where the original (pre-REV2) attempt had failed on `jsonb @> text[]`.

---

## 3. Rows Updated

`06_updates.sql` (REV2) executed successfully. No per-statement breakdown of the 30 individual `UPDATE` row counts was reported back to this session; the aggregate post-update verification (Section 4) confirms **399 of 399 expected chunks** show the corrected `normalized_reference`, which is consistent with all 30 statements having affected their full expected row count with no partial or zero-row statement.

---

## 4. Post-Update Verification Results (`07_verification_after.sql`, REV2)

| Check | Expected | Reported | Result |
|---|---|---|---|
| Sources with corrected `normalized_reference` | 30 | 30 | **PASS** |
| Chunks reflecting corrected reference | 399 | 399 | **PASS** |
| Missing old-reference entries in `normalized_aliases` | 0 | 0 | **PASS** |

Overall: **PASS**.

---

## 5. Alias Preservation Result

**PASS.** `missing_old_reference_aliases = 0` — every one of the 30 repaired sources has its pre-repair `normalized_reference` value preserved inside `normalized_aliases` (jsonb array containment check, per REV2's `to_jsonb`-based query). No source lost its old citation value during the repair.

---

## 6. R2 Pilot Non-Interference Result

**PASS.** Reported under the overall `08_control_group_check = PASS` result, which includes the dedicated query checking the 5 R2-pilot sources (RR 2-98, RR 11-2018, RR 8-2018, RR 12-2018, RMO 24-2013) retain their known post-R2 `normalized_reference` values. No separate numeric result for this query alone was reported; it is covered by the overall `08` PASS.

---

## 7. Control-Group Non-Interference Result

**PASS.** `control-group drift = 0 rows` — the 34-source already-correct control group (1,767-row backup, captured before `06_updates.sql` ran) shows zero discrepancies in `normalized_reference` or `normalized_aliases` against its pre-update snapshot. The 30-source repair scope did not leak into or otherwise affect any source outside its explicit `source` + `document_title` match list.

---

## 8. Rollback

**Not needed and not executed.** No rollback trigger condition (per `PATCH-027B-R3_FULL_REPAIR_PLAN.md` Rollback Strategy) was met: no retrieval regression, no chunk-count change, no control-group drift, and no duplicate aliases were observed. `09_rollback.sql` remains available but was not run.

---

## 9. Final Verdict

**PASS**

All pre-update gates passed, all 30 sources were updated to their correct self-referencing `normalized_reference`, all 399 chunks reflect the correction, alias preservation holds with zero gaps, the 5 R2-pilot sources and the 34-source control group show zero interference, and no rollback was required.

---

## Constraints Honored

No application code was changed as part of this execution or this report. No deployment occurred. No rollback was executed. This document records reported execution results only; it does not itself execute, modify, or query any database.
