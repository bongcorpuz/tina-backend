# TINA Engineering Contract

Status: ACTIVE REPOSITORY EXECUTION CONTRACT

## Purpose

This file is the shared model-neutral engineering contract for the TINA backend.

Harness-specific files such as AGENTS.md, CLAUDE.md, GEMINI.md, and
.github/copilot-instructions.md are bootstrap adapters only. They must point
here rather than maintain competing copies of TINA governance or engineering
policy.

Changing model, vendor, provider, IDE, or coding harness must not weaken TINA
governance, validation gates, evidence standards, or completion criteria.

## Instruction Precedence

Apply instructions in this order:

1. Platform and system safety requirements.
2. Explicit authorized user task instructions.
3. Committed TINA governance.
4. This repository execution contract.
5. The tina-engineering Skill when available.
6. Generic or global coding guidance.

A task instruction authorizes work; it does not silently waive TINA governance.

If a requested operation conflicts with committed governance, return SAFE_PAUSE
unless the task is explicitly to change governance through its governed review
process.

## Canonical TINA Governance

The TINA backend is an implementation repository.

The canonical governance repository is:

C:\Projects\tina-dev-factory

Do not treat the current working-copy contents of that repository as controlling
merely because files exist there or have newer timestamps.

The factory worktree may contain unrelated, modified, or untracked material.

For governed work, use committed Git evidence from the canonical remote ref.

Current canonical governance ref:

origin/feature/source-availability-engine-v1

Minimum established governance baseline:

2931bc31bf3508c2c876e20575d6cf8008889775

Before non-trivial governed engineering work:

1. Fetch the factory remote when network access is available and authorized.
2. Verify the minimum governance baseline is an ancestor of the canonical ref.
3. Read governance from the committed canonical ref, not from an unverified
   dirty working copy.
4. If the baseline cannot be proven, return SAFE_PAUSE rather than inventing
   governance.

Reference verification:

git -C C:\Projects\tina-dev-factory fetch origin

git -C C:\Projects\tina-dev-factory merge-base --is-ancestor `
  2931bc31bf3508c2c876e20575d6cf8008889775 `
  origin/feature/source-availability-engine-v1

Required governance documents:

- governance/TINA_NORTH_STAR.md
- governance/TINA_MANIFESTO.md
- governance/AGENT_RULES.md
- governance/RELEASE_GATES.md
- governance/adr/*.md
- standards/*.md

The release-gate governance bridge delegates the operative release-gate
requirements to the repository-relative:

tina_harness/RELEASE_GATE.md

Read both governance/RELEASE_GATES.md and tina_harness/RELEASE_GATE.md when
making release decisions.

## Governance Reading Method

When the factory working tree is dirty, prefer Git object reads such as:

git -C C:\Projects\tina-dev-factory show `
  origin/feature/source-availability-engine-v1:governance/TINA_NORTH_STAR.md

Use the same pattern for the Manifesto, Agent Rules, Release Gates, ADRs, and
standards.

Do not substitute similarly named files from backups, another worktree, editor
history, attachments, memory, or unrelated filesystem locations.

## Backend Execution Evidence

Before editing, testing mutations, staging, committing, pushing, deploying,
migrating, reindexing, or making a governance conclusion, establish:

- repository toplevel;
- current branch;
- HEAD;
- upstream;
- ahead/behind state;
- staged paths;
- modified paths;
- untracked paths;
- merge/rebase/cherry-pick/revert state;
- Git locks when relevant;
- exact authorized operation;
- authorized and prohibited paths.

Use committed backend evidence for operational continuity.

knowledge/CURRENT_STATE.md is operational continuity evidence, not a replacement
for canonical factory governance.

If CURRENT_STATE.md differs from HEAD, distinguish committed content from
working-copy content explicitly.

## Canonical Engineering References

For non-trivial patch work, load applicable engineering references from the
committed canonical tina-dev-factory ref.

Relevant references include:

- workflows/PATCH_WORKFLOW.md
- docs/TINA_MASTER_PROMPT.md
- docs/TINA_SUB_MASTER_PROMPT.md
- docs/AUTHORITY_HIERARCHY.md
- architecture/SOURCE_AVAILABILITY_CONTRACT.md
- architecture/TINA_SOURCE_CARD_STANDARDS.md
- governance/adr/ADR-001-Authority-Governance.md

These are factory-relative paths, not backend-relative paths.

Read them from committed Git evidence. Do not substitute similarly named
working-copy files.

Load only the references applicable to the governed work unit.

## Backend Execution Facts

The current backend regression command is:

npm test

which resolves through package.json to:

node scripts/run-regressions.mjs

The protected-file gate is:

npm run guard:files

which resolves to:

node scripts/forbidden-files-guard.mjs

scripts/forbidden-files-guard.mjs is tracked and is the backend enforcement
source for the protected-file gate.

Do not infer PASS from the existence of these commands. Execute required gates
and record their actual results.

## Patch Lifecycle

For governed patch work, follow the committed factory workflow:

workflows/PATCH_WORKFLOW.md

The lifecycle is:

Investigation
-> Root Cause
-> Implementation Plan
-> Implementation
-> Validation
-> Staging Validation
-> Release Gate Validation
-> Closure

Do not silently skip required stages.

## Authority Lock

Authority Lock is a protected TINA governance invariant.

Its controlling committed sources include:

- governance/AGENT_RULES.md
- governance/adr/ADR-001-Authority-Governance.md
- applicable committed standards and architecture contracts

There is no required standalone docs/AUTHORITY_LOCK.md file.

Once authority has validly reached the protected governing state, downstream
processing must not silently remove, downgrade, suppress, replace, or hide that
authority in violation of committed governance.

AUTHORITY_FOUND and associated authority/source-card integrity must survive
downstream processing as required by the controlling governance and architecture
contracts.

Do not weaken Authority Lock through retrieval optimization, reranking,
availability handling, rendering, formatting, or response optimization.

## Specialist Resources

The factory contains committed specialist guidance at:

- .claude/agents/patch-reviewer.md
- .claude/agents/tax-validator.md
- .claude/agents/retrieval-engineer.md
- .claude/agents/source-card-specialist.md

Use these when relevant to the governed work unit.

Treat them as specialist guidance unless the active harness actually supports
delegating an independent specialist role.

Do not claim specialist or independent review merely because a specialist file
was read.

## Durable Engineering Records

Existing TINA backend practice routes durable review and patch evidence into
the Dev Factory, including:

- reviews/records/
- patches/records/

Do not create competing backend-local governance records.

When a task requires writing durable factory evidence, use an authorized,
bounded factory branch or isolated worktree. Do not overwrite or contaminate
unrelated dirty factory workspace state.

The exact record type and destination remain subject to the applicable
committed workflow and governance.
## TINA Non-Negotiables

No verified source means no legal citation.

No metadata validation means no indexing.

No retrieval means no authoritative answer.

Retrieval precedes generation.

Authority integrity is more important than answer fluency.

Every displayed authority must be traceable to an indexed source.

Every displayed source must be traceable to its authority.

Authority Lock must not be silently weakened downstream.

No governance approval means no production deployment.

Related authority is not automatically controlling authority.

A textual citation is not automatically a verified citation.

Unavailable or unverifiable authority must fail closed rather than produce
false certainty.

## Skill Loading

When the harness supports Agent Skills, invoke tina-engineering for non-trivial
TINA engineering work.

The repository-specific TINA Engineering Contract remains controlling over
generic coding skills.

A project-local Skill copy is not required for this repository contract.

If native Skill loading is unavailable and the global file exists, the harness
may read:

$HOME\.agents\skills\tina-engineering\SKILL.md

If no Skill mechanism is available, execute this contract directly.

Absence of Skill tooling must never weaken TINA gates.

## Swarm Coder Contract

Detect capabilities, not model names.

Relevant capabilities include:

- subagent delegation;
- parallel execution;
- shell execution;
- filesystem edits;
- Git access;
- network access;
- native Skill loading.

Do not branch behavior based on GPT, Claude, Gemini, GLM, Kimi, Qwen, or any
other provider/model family.

Use these logical roles for non-trivial governed work:

Planner:
Own scope, governance preflight, architecture, acceptance criteria, and work
decomposition.

Coder 1:
Own production implementation.

Coder 2:
Own QA, automated tests, regression evidence, and failure classification.

Coder 3:
Own security review and security-focused tests.

Coder 4:
Own documentation, evidence capture, and handoff material.

Reviewer:
Own integration review and final gate decision.

If the harness supports safe delegation, roles may be delegated.

If it does not support subagents or parallelism, execute the same roles
sequentially.

Never claim parallel or independent review that did not actually occur.

## Reviewer Outcomes

Use only these outcomes when a formal engineering review is required:

APPROVED

APPROVED_WITH_NONBLOCKING_FINDINGS

CHANGES_REQUIRED

SAFE_PAUSE

TECHNICAL_INCOMPLETE

Do not convert missing evidence into PASS.

## Git Safety

Preserve existing user work.

Do not run destructive Git operations without explicit authorization.

Do not use git add . in a dirty TINA worktree.

Stage exact reviewed paths only.

Do not commit unrelated temporary files, credentials, local outputs, backups,
evaluation residue, or user workspace state.

Treat secret-looking files such as auth.json and environment credentials as
sensitive.

When current worktree contamination prevents bounded evidence, use an isolated
Git worktree rather than deleting or hiding unrelated work.

## Regression Discipline

Do not compare only raw test counts when an existing baseline is known to fail.

For no-new-regression adjudication:

1. Establish the candidate commit and exact changed-file scope.
2. Establish an equivalent clean baseline.
3. Use equivalent environment and test commands.
4. Normalize failure identities rather than comparing timing-dependent output.
5. Identify candidate-only failures.
6. Candidate-only deterministic failures are regressions unless separately
   adjudicated with evidence.

Historical baseline failures must not be silently attributed to the candidate.

Do not rewrite CURRENT_STATE.md or another governance artifact merely to make a
historical assertion test pass.

## Staging Discipline

Distinguish:

- static staging assertions;
- staging-runner execution;
- authenticated live network validation.

Do not say "staging passed" when a required live path was skipped.

Record skipped paths and required environment flags explicitly.

## Security Discipline

Treat route exposure, tenant isolation, secrets, CORS, rate limits, headers,
logging, source integrity, and authorization boundaries as security-sensitive.

Public /health is liveness unless governance explicitly defines otherwise.

Do not silently turn a public liveness route into a dependency or readiness
probe.

Never expose secrets in query strings, logs, evidence packets, or handoffs.

## Evidence and Handoff

Never invent command output, test results, approvals, reviews, deployment state,
or external validation.

A model or harness handoff should contain enough information for another model
to continue without hidden context:

- objective;
- acceptance criteria;
- repository and branch;
- HEAD and relevant base;
- changed files;
- commands executed;
- results;
- failures;
- skipped checks;
- permissions and gates;
- reviewer decision;
- precise next action.

Switching models must preserve the same governance and evidence standard.

## Completion

A governed work unit is complete only when:

- authorized scope is satisfied;
- required tests and gates are executed or explicitly recorded as skipped;
- new regressions are not hidden by historical failures;
- security-sensitive effects are reviewed when applicable;
- changed-file scope is bounded;
- evidence is reproducible;
- reviewer outcome is recorded when required;
- deployment or publication gates are respected.

When required authority, evidence, environment, or approval is unavailable,
return SAFE_PAUSE or TECHNICAL_INCOMPLETE rather than overstating completion.
