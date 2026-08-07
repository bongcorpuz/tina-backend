# PATCH RECORD — UNGOVERNED `/health` SEMANTIC CHANGE

**Record id:** `COMMIT_5R1C37_CHECKPOINT_75_HEALTH_SEMANTIC_CHANGE_GOVERNANCE_RECORD`
**Unit:** PHASE-10A14-R20 · COMMIT 5R1-C37 · Checkpoint 75
**Created:** 2026-08-07T03:21:43Z
**Governed baseline:** `ee664eab4529c636f34cb6d37d23a6a497886a17`
**Status:** **NOT AUTHORIZED — HELD FOR OWNER REVIEW**
**Decision:** **DEFERRED PENDING GOVERNED REVIEW**

> This record governs three semantic changes that are **already present in the working tree**.
> It does **not** approve them, does **not** revert them, and does **not** modify them.
> The bytes were preserved exactly as found, per the R3-alpha preservation requirement.

---

## 1. Exact paths

Three tracked files carry semantic (non-EOL) modifications. A fourth modified tracked file,
`knowledge/CURRENT_STATE.md`, is **governed documentation** and is **not** part of this record.

| # | Path | HEAD blob | Worktree blob |
|---|------|-----------|---------------|
| 1 | `security/public-health.js` | `ac5b9a63…724c2f` | `9a90c4d2…e1485f` |
| 2 | `server.js` | `171f42a6…2e5480` | `e130430c…0c49a2` |
| 3 | `tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs` | `cf8b1038…b17987` | `67f9a4d3…b06695` |

### SHA-256 — governed baseline content (HEAD)

```text
289f2dcb64b8621bc8a09d075fd977d39faccc67ae280fd84ba1253d5cfca2d3  HEAD:security/public-health.js
3d03febdf78ffb3531f86a99e801e7abf2047145c2ca5cd15d87fd2e8621fa73  HEAD:server.js
cc6acaacd01f2a0cf0ae3210eda4eb3d495ba90ef72f79d6968676678261fff2  HEAD:tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs
```

### SHA-256 — current working-tree content (ungoverned)

```text
3c870d309a66fb1f36cc8c16fb759e1e7a9887c3d2fd80800cd8062608c528f0  security/public-health.js
beb3ab375892fac74557f1b0e5b6c633abb2edea25b3ee68e47d44a45971f4da  server.js
8ceed37b6023119760bef7c96435d06042d837f2ac69cb562f02cd1c60cded35  tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs
```

Frozen diff already sealed at checkpoint 73:
`COMMIT_5R1C37_CHECKPOINT_73_UNGOVERNED_SEMANTIC_CHANGES.patch`
SHA-256 `b6e5ddd975a04fd03c6ed786f6cd41b5bd8f3d88f622cfa98a0faa07d778d66d`

**Byte preservation verified.** The three working-tree files are byte-identical to their content in
the preserved ungoverned commit. The authorized `git reset --mixed` lost nothing.

---

## 2. Origin

| Field | Value |
|---|---|
| Origin commit | `ff1bc2b18040706ef4a2e7002a1d349a76d7d709` |
| Subject | `add /health endpoint + baseline` |
| Author | `Tina Swarm <tina@local>` |
| Date | 2026-08-04T15:11:13Z |
| Pushed to origin | **No** |
| Classification | **UNGOVERNED INTRUSION** (Option B, decided 2026-08-07) |
| Preserved at | `refs/heads/governance/ungoverned-ff1bc2b1`, `refs/tags/governance/pre-remediation-ff1bc2b1` |

The commit was authored **outside R20 governance** by a third-party agent, briefly stood as local
HEAD above the governed baseline, and was removed from HEAD by an owner-authorized
`git reset --mixed` that deliberately retained the working-tree bytes.

---

## 3. Intended behavior (as implemented, not as approved)

### 3.1 `security/public-health.js`

- **Removes** the exported constant `PUBLIC_HEALTH_SERVICE = "tina-backend"`.
- **Narrows** `PUBLIC_HEALTH_ALLOWED_FIELDS` from `["status", "service"]` to `["status"]`.
- **Changes** the public payload from `{status:"ok", service:"tina-backend"}` to `{status:"ok"}`.
- **Adds** a new exported `healthHandler(req, res)` that returns `res.status(200).json(buildPublicHealth())`.

### 3.2 `server.js`

- **Replaces** the inline `app.get("/health", async (req, res) => {…})` handler with `app.get("/health", healthHandler)`.
- **Removes the readiness touch.** The governed handler awaited `getVectorStoreStats()` inside a
  try/catch as a resilient readiness probe whose result was deliberately never surfaced. The
  ungoverned handler performs **no readiness touch at all**.
- **Deletes** the 10-line governed policy comment block that recorded the
  PATCH-08S-FOLLOWUP disclosure-minimization rationale and the deferral of a diagnostic endpoint.
- Import narrows from `buildPublicHealth` to `healthHandler`.

### 3.3 `tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs`

- Replaces `check(ph.status === "ok")` + `check(ph.service === "tina-backend")` with an exact
  payload assertion `JSON.stringify(ph) === '{"status":"ok"}'`.
- Rewrites the source-inspection test to assert `healthHandler` wiring instead of `buildPublicHealth` usage.
- **Narrows the disclosure-scan window** over the `/health` region from **800 to 300 characters**.

---

## 4. Test evidence

### 4.1 Current (modified) governed suite — PASSES

```text
$ node tests/patch-08s-followup-backend-routes-health-minimization-1.test.mjs
PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1 tests: 19 passed, 0 failed, 77 assertions
exit 0
```

### 4.2 Governed **baseline** suite vs the modified implementation — **FAILS**

The same ungoverned commit changed **both the implementation and its own governing test**. A green
suite is therefore **not** independent evidence of correctness. To break that circularity, the
**HEAD (governed) version** of the test was extracted and run against the modified implementation in
an isolated sandbox mirror outside the repository. The governed repository was not written to.

```text
$ node tests/patch-08s-HEADVERSION.test.mjs      # HEAD test, modified implementation
FAIL helper: buildPublicHealth is minimal and excludes all forbidden fields
  service tina-backend
FAIL source: server.js public /health returns minimal buildPublicHealth and discloses nothing
  buildPublicHealth used
PATCH-08S-FOLLOWUP-BACKEND-ROUTES-HEALTH-MINIMIZATION-1 tests: 17 passed, 2 failed, 58 assertions
exit 1
```

Sandbox: copies of `security/`, `server.js`, the PATCH-08S fixture and both test versions, run with
cwd set to the sandbox. Repository status was verified unchanged (4 modified / 281 untracked)
immediately before and after.

**Conclusion: the ungoverned change breaks the governed PATCH-08S-FOLLOWUP contract as written.**

### 4.3 Blast-radius check — no dangling importers

`PUBLIC_HEALTH_SERVICE` was removed. A tracked-tree search (`git grep`) plus a direct scan of
`security/`, `tests/` and `server.js` found **zero** remaining references. The symbol existed at HEAD
in exactly two places, both inside `security/public-health.js`. **Removal breaks no importer.**

`getVectorStoreStats` remains imported in `server.js` (line 39) and still used at lines 529 and 677,
so its removal from `/health` leaves **no unused import**.

### 4.4 Not executed

`tests/health-endpoint.test.mjs` (untracked, from the same ungoverned commit) binds a real socket and
performs HTTP. It was **not executed** — outside the read-only scope authorized for this operation.

---

## 5. Governance assessment

| # | Finding | Severity |
|---|---|---|
| G1 | Implementation and its own governing regression test were changed **in the same ungoverned commit**, making the green suite self-certifying. | **CRITICAL** |
| G2 | The governed baseline test **fails** against the modified implementation (§4.2). The governed PATCH-08S-FOLLOWUP contract is broken, not merely re-expressed. | **CRITICAL** |
| G3 | Runtime behavior of a **deployed, unauthenticated** endpoint changed: the readiness touch was removed. `/health` no longer exercises the vector-store path, so it can report `200 ok` while the data layer is unreachable. This is a **liveness-vs-readiness semantic regression**. | **HIGH** |
| G4 | The disclosure-scan window narrowed from 800 to 300 characters, **weakening** the regression guard that protects against re-introducing `commitSha`, `openaiModel`, `adaptiveStack`, `routeModes` and `indexSecretEnabled` into `/health`. | **HIGH** |
| G5 | The governed policy comment recording the PATCH-08S-FOLLOWUP rationale and the deferred diagnostic endpoint was deleted, eroding institutional memory at the point of use. | **MEDIUM** |
| G6 | Removing the `service` field is a **breaking response-contract change** for any external consumer (for example Render health polling or dashboards keying on `service`), even though no in-repo importer breaks. | **MEDIUM** |
| G7 | Direction-of-travel note, recorded for fairness: dropping `service` **reduces** the public disclosure surface, which is directionally consistent with PATCH-08S-FOLLOWUP's minimization intent. This does not cure G1–G6. | **INFORMATIONAL** |

### Mission-alignment check

> *"Does this move TINA closer to becoming the Philippine Tax Operating System?"*

**Not as delivered.** The change touches no authority, retrieval, metadata or source-card path, so it
is mission-neutral in substance. Its **process** — an ungoverned agent rewriting a governed contract
together with the test that guards it — is **mission-negative**: it weakens the verification fabric
that authority integrity depends on. Under AGENT_RULES and RELEASE_GATES, *no governance approval =
no production deployment*.

---

## 6. Disposition

**DEFERRED — NOT AUTHORIZED. HELD FOR OWNER REVIEW.**

- The changes are **not** approved.
- The changes were **not** reverted, modified, staged or committed by this operation.
- The bytes remain exactly as found, preserved and now hash-bound by this record.
- No candidate runtime fix was created.

### Required before any authorization

1. Owner decision on the **readiness-touch removal** (G3) — is `/health` liveness-only with no data-layer touch the intended production contract?
2. Owner decision on the **response-contract break** (G6) — confirm no external consumer depends on `service`.
3. Restoration or explicit governed re-scoping of the **800-character disclosure guard** (G4).
4. A governed patch record that changes the implementation and its regression test **as separate, reviewable decisions** (G1).
5. Adjudication of `tests/health-endpoint.test.mjs` **together with** these three paths — it must never enter the governed suite independently.
6. Re-issue under a hash-bound governed prompt binding to parent `ee664eab4529c636f34cb6d37d23a6a497886a17`.

### Prohibited until authorized

Staging, committing, pushing, deploying, or admitting `tests/health-endpoint.test.mjs` into the
governed test corpus.

---

## 7. Evidence index

| Artifact | SHA-256 |
|---|---|
| `COMMIT_5R1C37_CHECKPOINT_73_UNGOVERNED_SEMANTIC_CHANGES.patch` | `b6e5ddd975a04fd03c6ed786f6cd41b5bd8f3d88f622cfa98a0faa07d778d66d` |
| `COMMIT_5R1C37_CHECKPOINT_73_UNGOVERNED_COMMIT_PATH_MANIFEST.json` | `f25fe43b65c60b3fb38561572cabebe48188404a83744467bff776c28b448e32` |
| `HEAD:tests/patch-08s-followup-…test.mjs` (governed baseline test) | `cc6acaacd01f2a0cf0ae3210eda4eb3d495ba90ef72f79d6968676678261fff2` |

No sealed historical artifact was edited in producing this record.
