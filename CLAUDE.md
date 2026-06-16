# Governance Authority

This repository is an implementation repository.

The authoritative governance repository for TINA is:

c:\Projects\tina-dev-factory

Before proposing, reviewing, implementing, approving, refactoring, auditing, or deploying any change, read and comply with:

Required governance references:

* governance/TINA_NORTH_STAR.md
* governance/AGENT_RULES.md
* governance/RELEASE_GATES.md
* governance/adr/*
* governance/standards/*

Governance hierarchy:

1. TINA_NORTH_STAR.md
2. AGENT_RULES.md
3. RELEASE_GATES.md
4. ADRs
5. Standards
6. Architecture Documents
7. Implementation Documents
8. Source Code

If a lower-level artifact conflicts with a higher-level governance document, the higher-level governance document prevails.

Non-Negotiable Rules:

* No verified source = no legal citation
* No metadata validation = no indexing
* No retrieval = no authoritative answer
* Retrieval precedes generation
* Authority integrity is more important than answer fluency
* Every authority must be traceable to an indexed source
* Every source must be traceable to an authority
* No governance approval = no production deployment

Mission Alignment Check:

Before proposing any feature, patch, refactor, architecture change, ingestion rule, retrieval change, indexing change, metadata change, source-card change, authority change, compliance change, or deployment:

Ask:

"Does this move TINA closer to becoming the Philippine Tax Operating System?"

If the answer is no, do not recommend the change without documented justification.

---

# TINA Backend — Claude Code Bridge

Project: TINA — Philippine Tax Research Platform.

This repository contains runtime code, retrieval systems, authority systems, source-card systems, compliance systems, APIs, tests, and executable release gates.

Governance, standards, strategic direction, audits, architecture decisions, and patch governance are maintained in:

c:\Projects\tina-dev-factory

Do not duplicate governance documents in this repository.

Reference them.

---

# Current Program Status

Program:
TINA (Tax Information and Navigation Assistant)

Current Phase:
RELEASE GATE VALIDATION

Active Branch:
feature/source-availability-engine-v1

Target Environment:
tina-backend-staging

Production Branch:
main

Primary Objective:

* Eliminate authority hallucinations
* Eliminate unsupported citations
* Eliminate source-card mismatches
* Preserve authority integrity
* Complete release-gate validation
* Prepare for CTI foundation

---

# Required Reading Before Patch Work

Before implementing, reviewing, approving, or validating any patch, read and follow:

* docs/TINA_MASTER_PROMPT.md
* docs/TINA_SUB_MASTER_PROMPT.md
* docs/AUTHORITY_HIERARCHY.md
* docs/AUTHORITY_LOCK.md
* docs/SOURCE_AVAILABILITY_CONTRACT.md
* architecture/TINA_SOURCE_CARD_STANDARDS.md

---

# Authority Lock (Mandatory)

Authority Lock is a protected architectural rule.

Once an authority is accepted and locked, it must not be:

* Removed
* Downgraded
* Suppressed
* Replaced
* Hidden

by:

* Semantic filtering
* Reranking
* Retrieval optimization
* Source availability logic
* Rendering logic
* Formatting logic
* Response optimization

AUTHORITY_FOUND must survive downstream processing.

Locked authorities must survive downstream processing.

Visible authorities must survive downstream processing.

Source cards must survive downstream processing.

No patch may weaken Authority Lock.

---

# Release Gate Rules

A release cannot pass if any of the following exist:

* Authority hallucinations
* Unsupported citations
* Source-card mismatches
* Metadata pollution
* Authority verification failures
* Broken authority traceability

Mandatory validations:

* Regression suite PASS
* Release gate PASS
* Authority validation PASS
* Metadata validation PASS
* Red Team validation PASS

---

# Execution Facts

Regression Gate:

npm test

Includes:

* Syntax checks
* tests/*.test.mjs
* *_stage*_test.mjs

Protected File Gate:

npm run guard:files

Protected file list:

scripts/forbidden-files-guard.mjs

This file is the single source of truth for protected-file enforcement.

---

# Patch Workflow

All patch work follows:

c:\Projects\tina-dev-factory\workflows\PATCH_WORKFLOW.md

Required patch lifecycle:

Investigation
→ Root Cause
→ Implementation Plan
→ Implementation
→ Validation
→ Staging Validation
→ Release Gate Validation
→ Closure

Do not skip stages.

---

# Canonical Governance References

Read before patch work.

Do not duplicate.

Authority Governance:

c:\Projects\tina-dev-factory\docs\AUTHORITY_HIERARCHY.md

Authority Lock:

c:\Projects\tina-dev-factory\docs\AUTHORITY_LOCK.md

Master Prompts:

c:\Projects\tina-dev-factory\docs\TINA_MASTER_PROMPT.md

c:\Projects\tina-dev-factory\docs\TINA_SUB_MASTER_PROMPT.md

Architecture:

c:\Projects\tina-dev-factory\architecture\

Release Gates:

c:\Projects\tina-dev-factory\tina_harness\RELEASE_GATE.md

North Star:

c:\Projects\tina-dev-factory\governance\TINA_NORTH_STAR.md

---

# Specialist Agents

Consult by reading these files.

Never duplicate agent logic.

Patch Review:

c:\Projects\tina-dev-factory.claude\agents\patch-reviewer.md

Authority Validation:

c:\Projects\tina-dev-factory.claude\agents\tax-validator.md

Retrieval Engineering:

c:\Projects\tina-dev-factory.claude\agents\retrieval-engineer.md

Source Cards:

c:\Projects\tina-dev-factory.claude\agents\source-card-specialist.md

Future specialists must be added to Dev Factory and referenced here.

---

# Output Routing

Review reports, audit reports, validation reports, state documents, patch artifacts, and governance artifacts produced during backend sessions must be written to:

c:\Projects\tina-dev-factory\reviews\records\

or

c:\Projects\tina-dev-factory\patches\records\

Do not create backend-local governance records.

The Dev Factory is the permanent memory of TINA.

---

# Long-Term Architectural Direction

TINA is being built toward:

Best Philippine Tax AI
→ Philippine Tax Research Standard
→ Philippine Tax Operating System
→ Institutional Tax Memory of the Philippines

All recommendations should support:

* Authority Governance
* Knowledge Integrity
* Temporal Accuracy
* Tax Reasoning
* Trust & Explainability

The LLM is replaceable.

Governance is not.

Authority integrity is not.

Trust is not.
