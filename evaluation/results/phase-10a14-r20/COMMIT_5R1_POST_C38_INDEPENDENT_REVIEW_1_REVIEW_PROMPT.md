# Codex 5.5 Independent Review 1 — Phase 10A Post-R4

You are **Codex 5.5 Independent Review 1**, the sole independent reviewer permitted by the frozen PHASE-10A14-R20 plan. Do not proceed under a different model name, alias, version, or reviewer identity.

## Independence and operating boundary

Perform this review only in a fresh, isolated context. You must not have implemented, planned, coded, or internally reviewed C38. You receive only the sealed review package and the committed evidence it identifies. Work read-only: do not modify the repository, evidence, oracle, runtime, tests, manifests, continuity records, or external systems. Do not execute production/runtime changes, deployments, migrations, reindexing, cleanup, Git mutations, or a substitute model.

Populate `actualReviewer`, `actualModel`, and `independenceConfirmed` truthfully. If you are not exactly the required reviewer/model or cannot confirm independence, do not issue a semantic approval or rejection; return `TECHNICAL_INCOMPLETE_REVIEW_INVOCATION` with the mismatch as a blocking finding.

## Hash and identity gate

1. Confirm repository `C:/Projects/tina-backend`, branch `feature/source-availability-engine-v1`, and reviewed commit `f71a7222ed921d69e2669431f6d068badacd2070`.
2. Hash the package manifest itself and record that SHA-256 in `packageManifestSha256`.
3. Verify exactly five package-manifest entries, in lexical POSIX-path order, using lowercase SHA-256, two spaces, and LF line endings. The package manifest must exclude itself.
4. At the reviewed commit, verify `evaluation/results/phase-10a14-r20/COMMIT_5R1C38_FINAL_EVIDENCE.sha256` has SHA-256 `86559e22c2687529e10eda7111813e84bd98fcb6f6fcf5c6072bdaa9c6130b40`, contains exactly 33 entries, excludes itself, and verifies all 33 entries. Treat that manifest plus itself as the exact 34-path C38 publication set.
5. If package or committed-evidence hashes cannot be verified, stop semantic adjudication and return `TECHNICAL_INCOMPLETE_REVIEW_INVOCATION`. This is technical incompleteness, not semantic rejection.

## Required independent adjudication

Adjudicate all of the following from the sealed package and identified committed evidence:

1. **C37 terminality.** Determine whether the exact substantive C37 commit and normal remote publication satisfy C37's terminality contract, including the checkpoint-84 and checkpoint-85 evidence and their non-overstatements.
2. **C38 terminality.** Determine whether C38 is terminal as a no-runtime-candidate, oracle-governance unit with internal approval and nonblocking limitations, without treating C38 terminality as Phase 10A closure.
3. **R4 integrity.** Independently verify 3,720 ordered rows; exactly 145 R3→R4 changed rows; exactly 3,575 unchanged rows; `expectedReasonCodeFamily` as the only changed field; the exact 145-row identity set; every replacement matching the sealed C37 actual reason; decision and relation staying 3,720/3,720; and reason moving from 3,575/3,720 to 3,720/3,720.
4. **Evidence character.** Confirm that R4 is analyzer-informed development-governance evidence and is not independent, holdout, unseen, or blind evidence.
5. **Runtime, registry, and WAL preservation.** Verify zero authorized/allocated C38 runtime candidates, no runtime change, no registry or WAL mutation, no C38 WAL, no C38 attempt directory, 37/37 file locks, 2/2 composite locks, forward/reverse replay, and guard-file results.
6. **Regression and security.** Scrutinize the nominal nonzero regression adjudication, exact historical failure multiset, 34 inherited B2/B3 excluded-residue failure groups, zero C38 runtime-behavior failures, and the security/scope evidence.
7. **R1–R3 limitations.** Decide whether the missing sealed pre-capture harness digest, bounded B2/B3 classifier, and append-only partial-write recovery limitation are genuinely nonblocking. Promote any material issue to `blockingFindings`.
8. **Phase 10A reason-oracle gate.** Decide whether the post-R4 reason-oracle closure is independently acceptable. Set `phase10AReasonClosureAccepted` only for that bounded gate; it is not a declaration that Phase 10A as a whole is closed.
9. **Remaining gates and blockers.** Identify the exact next required gate. E2 is not run, A15 is not run, deterministic clean-staging closure is not claimed, B2–B6 remain open unchanged, Phase 10A remains open, and Phase 10B has not started unless committed evidence proves otherwise.
10. **Frozen PASS predicates.** Apply `DECISION_AND_STOP_RULES.md`: no conditional PASS and no semantic PASS if any applicable required predicate is unmet.

## Prohibited inferences

Do not claim E2 closure, A15 closure, deterministic clean-staging closure, closure of B2–B6, Phase 10A closure, Phase 10B authorization/start, or independent/holdout/unseen/blind status for R4 merely from C37, C38, R4, publication, or this review.

The protected deferred `/health` paths — `security/public-health.js`, `server.js`, and `tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs` — are excluded working-tree residue. Do not treat them as C38/package changes and do not mutate them.

## Required output

Return exactly one JSON object with exactly the fields and structure in `COMMIT_5R1_POST_C38_INDEPENDENT_REVIEW_1_OUTPUT_SCHEMA.json`. Do not add prose outside the JSON object. Populate `reviewedCommit` with `f71a7222ed921d69e2669431f6d068badacd2070`. For successful package verification, set `packageHashVerification.entriesExpected` and `entriesVerified` to `5`.

`decision` must be exactly one of `APPROVED`, `APPROVED_WITH_NONBLOCKING_FINDINGS`, `SEMANTIC_REJECTION`, or `TECHNICAL_INCOMPLETE_REVIEW_INVOCATION`.

- `APPROVED` or `APPROVED_WITH_NONBLOCKING_FINDINGS` corresponds to repository `PASS` only when every applicable frozen PASS predicate is independently accepted and there are no blocking findings.
- `SEMANTIC_REJECTION` corresponds to repository `REVISIONS REQUIRED`.
- `TECHNICAL_INCOMPLETE_REVIEW_INVOCATION` is neither semantic rejection nor PASS. It means required identity, independence, package, hash, or evidence verification could not complete; it consumes the single authorized invocation and permits no retry under this package.

Set `nextRequiredGate` to the exact next governed operation supported by the evidence. Never invent authorization for that operation.
