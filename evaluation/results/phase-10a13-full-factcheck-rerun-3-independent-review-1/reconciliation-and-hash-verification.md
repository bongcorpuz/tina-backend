# Reconciliation And Hash Verification

## Repository

- Branch: `feature/source-availability-engine-v1`
- Review start HEAD: `938cb53f8539e014a4e29d126d9f9f67b0ce4734`
- Upstream sync at start: `0 0`
- Protected untracked paths preserved: `.claude/`, `.vscode/`, `evaluation/factcheck/`
- Commit ancestry: `9559bf3 -> d71b913 -> cb4c197 -> 938cb53`

## A13 Commit Scope

- `d71b913`: added A13 execution manifest, manifest hash, source-bank question hashes, and pre-run runner logs only.
- `cb4c197`: added 150 canonical payloads, runlog/retry log, count reconciliation, cross-run consistency, fact-check matrix, invalid/questionable register, and verified worksheet only.
- `938cb53`: added result JSON, report, post-run runner logs, security/scope review, evidence manifest, and CURRENT_STATE update.
- No A13 commit modified runtime code, validator code, test code, package files, model configuration, source bank, corpus, retrieval, frontend, or Dev Factory files.

## Source Bank And Manifest

- Source-bank snapshot hash reproduced: `526106e594667705df227930dff3d9a4717ec99b171626bf708db43f4eac4bed`
- Manifest hash reproduced: `7ef642344406546bc92fa820e41869c15fbd7ef1df7a619487eb65dfd6a86d79`
- Manifest characteristics verified: Q1 through Q50, three deterministic rounds, runtime commit `d71b913ddf39726234dd02d858fac3e5275e865b`, expected canonical evaluations 150, persistence count 2, fixed serialization rules.

Chronology from committed evidence:

| event | evidence |
|---|---|
| Manifest commit | `d71b913`, commit time `2026-07-17T09:16:14+08:00` |
| First canonical live request | A13 runlog slot 1 `2026-07-17T01:18:35.288Z` (`2026-07-17T09:18:35.288+08:00`) |
| Final canonical live request | A13 runlog slot 150, before evidence commit |
| Evidence commit | `cb4c197`, commit time `2026-07-17T10:01:27+08:00` |
| Result/report commit | `938cb53`, commit time `2026-07-17T10:07:34+08:00` |

Local git metadata proves manifest commit before live requests and current remote ancestry contains the manifest. Local git metadata does not independently expose the exact remote push timestamp.

## 150-Run Reconciliation

Direct payload/runlog parse reproduced:

| item | result |
|---|---|
| Payload files | 150 |
| Runlog entries | 150 |
| Unique questions | 50 |
| Required rounds per question | 3 |
| Questions missing any round | 0 |
| Duplicate canonical slots | 0 |
| Prompt mismatches | 0 |
| Runtime mismatches | 0 |
| Persistence failures | 0 |
| Payload/runlog SHA-256 mismatches | 0 |

Authority-support counts:

| trust state | payload count | runlog count |
|---|---:|---:|
| VERIFIED_CONTROLLING | 30 | 30 |
| RELATED_AUTHORITY_ONLY | 72 | 72 |
| NO_VERIFIED_AUTHORITY | 48 | 48 |
| Total | 150 | 150 |

Retry review:

- `a13-retry-log.jsonl` has 3 superseded technical attempts, all Q10.
- Reasons were `technical status=200 answerLen=16 persist=2`.
- Superseded attempts are preserved in the retry log and excluded from the 150 canonical payload total.
- No evidence of answer-quality or unfavorable-result replacement was found.

## Evidence Manifest

- `EVIDENCE_MANIFEST.sha256` entries: 165
- Hash mismatches: 0
- Uncovered committed evidence files under the A13 directory: 0
- Result: evidence-hash integrity PASS.

## Runner Verification

Committed logs:

- Pre-run deterministic: 189 suites, 0 failures, exit 0.
- Pre-run staging: 7 suites, 0 failures, exit 0.
- Post-run deterministic: 189 suites, 0 failures, exit 0.
- Post-run staging: 7 suites, 0 failures, exit 0.

Independent reruns:

- `node scripts/run-regressions.mjs`: exit 0; syntax checks 10/0; suites 189/0.
- `node scripts/run-staging-smokes.mjs` sandboxed: exit 1; staging temporarily unreachable triggered reachability consistency failure.
- `node scripts/run-staging-smokes.mjs` network-enabled: exit 0; suites 7/0.

Combined suite accounting: 189 + 7 = 196.

## Security And Process State

- Narrow credential-shaped scan found no OpenAI keys, Slack tokens, private keys, or literal Authorization Bearer values in A13 evidence/report.
- Broad scan hits were governance prose/test names only.
- Existing Node processes were observed before and after review; only localhost `5173` listeners were found. No backend port listener was observed by the checked port patterns.
- Review started no backend server and made no runtime cleanup changes.
