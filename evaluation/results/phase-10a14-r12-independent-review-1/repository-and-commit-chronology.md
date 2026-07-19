# Repository And Commit Chronology

Repository: `C:\Projects\tina-backend`
Branch: `feature/source-availability-engine-v1`
Reviewed HEAD: `af4baabe8a52230e2b3e3fd65a13af1d17daa1a3`
R12 base: `b4575bacfd941967132caacffd0ff792057025e4`

Initial tracked tree was clean, with only protected untracked `.claude/`, `.vscode/`, and `evaluation/factcheck/` present. The branch was synchronized with origin at review start: ahead/behind `0 0`.

## Linear R12 Commits

1. `dce5f717b5af206476558b0bbc01a3c514dd1e76`, parent `b4575bacfd941967132caacffd0ff792057025e4`, 2026-07-19T19:04:29+08:00, `PHASE-10A14-R12 COMMIT 1: frozen manifest, P1 reproduction, persistence contract`.
2. `70790c3158cd32a877e87d9a401354878d383cd0`, parent `dce5f717b5af206476558b0bbc01a3c514dd1e76`, 2026-07-19T19:07:29+08:00, `PHASE-10A14-R12 COMMIT 2: immutable pre-fix evidence (unchanged R11 runtime 90d70fe)`.
3. `d91b6978cda1ed3e31740566de8ef5f2061868ce`, parent `70790c3158cd32a877e87d9a401354878d383cd0`, 2026-07-19T19:15:53+08:00, `PHASE-10A14-R12 COMMIT 3: structured directive classification + NOT_APPLICABLE persistence`.
4. `e9b6c58d98305abdfb3391ef8e65d7c72ac512fa`, parent `d91b6978cda1ed3e31740566de8ef5f2061868ce`, 2026-07-19T19:23:43+08:00, `PHASE-10A14-R12 COMMIT 4: complete post-fix rerun + pre/post reconciliation`.
5. `eec73e6ec607c5f7ba3bd7f58fe8d04f671f1d03`, parent `e9b6c58d98305abdfb3391ef8e65d7c72ac512fa`, 2026-07-19T19:25:17+08:00, `PHASE-10A14-R12 COMMIT 5: governance supersession, report, result, CURRENT_STATE, security`.
6. `af4baabe8a52230e2b3e3fd65a13af1d17daa1a3`, parent `eec73e6ec607c5f7ba3bd7f58fe8d04f671f1d03`, 2026-07-19T19:31:12+08:00, `PHASE-10A14-R12 COMMIT 6: clean-tree gates + evidence manifest (self-excluding)`.

## Chronology Checks

- `70790c3158cd32a877e87d9a401354878d383cd0` is a strict ancestor of `d91b6978cda1ed3e31740566de8ef5f2061868ce`.
- No pre-fix evidence path changed after commit 2.
- `ask-handler.js`, `services/answer-support-validator.js`, and the R12 focused test did not change after commit 3.
- R12 runtime scope is limited to `ask-handler.js` and `services/answer-support-validator.js`; one focused test was added.
