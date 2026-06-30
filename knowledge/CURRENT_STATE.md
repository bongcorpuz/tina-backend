# CURRENT_STATE.md

## TINA Continuity Status

Current phase:

```text
PHASE 6G - Authority / Pipeline Decomposition Planning Under Evaluation Guard
```

Current status:

```text
PHASE 6F CLOSED / PASS
PHASE 6G ACTIVE
PATCH-06F-GATE-1 COMPLETE / LOCAL PASS
PATCH-06G-001 COMPLETE / LOCAL PASS
PATCH-06G-002 COMPLETE / LOCAL PASS
PATCH-06G-003 COMPLETE / LOCAL PASS
PATCH-06G-004 COMPLETE / LOCAL PASS
PATCH-06G-005 COMPLETE / LOCAL PASS
```

Current backend branch:

```text
feature/source-availability-engine-v1
```

Current repo:

```text
C:/Projects/tina-backend
```

Backend service:

```text
tina-backend-staging
```

Environment:

```text
staging
```

Current known staging baseline:

```text
/health: ok
indexingRunning: false
vector store: 5,346 chunks / 102 sources
```

Current corpus / ingestion rule:

```text
No DB/indexing/RAG/vector/corpus updates unless expressly approved.
New Google Drive / Backblaze B2 / other source files remain parked or mirrored only.
No automatic ingestion until Phase 10 source-governance workflow is implemented.
```

Latest implemented patch:

```text
PATCH-06G-005 - SAE boundary documentation comments in pipeline.js
```

Latest pushed commit:

```text
PATCH-06G-005 document SAE boundary
```

Current working state:

```text
PATCH-06G-005 COMPLETE / LOCAL PASS
SAE boundary documentation comments completed.
Key findings:
- Wrapper adapter pattern was collapsed in pipeline.js after PATCH-06G-003 equivalence coverage.
- pipeline.js now imports source-card helpers directly from source-card-engine.js.
- Focused PATCH-06G-003 test now locks the collapsed direct-import state and representative source-card-engine fixtures.
- classifySourceAvailability remains exported from pipeline.js and imported by 6+ test files — cannot move in Phase 6G.
- source-visibility-engine.js is a utility/display module, not a SAE classifier.
- Two distinct SAE functions in pipeline.js: computeSourceAvailability (private) and classifySourceAvailability (exported).
- PATCH-06G-005 added comment-only SAE boundary notes around computeSourceAvailability, classifySourceAvailability, and the classifier call site.
- Phase 6G stabilization gate is the next required step before further decomposition.
Phase 6G active.
```

Immediate next task:

```text
PATCH-06G-GATE-1 - Phase 6G Stabilization Gate
```

Expected next gate:

```text
PATCH-06G-GATE-1 - Decomposition planning gate, if needed
```

Next phase after Phase 6E closes:

```text
PHASE 6F - Automated Evaluation & Regression Harness
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

Do not broaden patch scope.

Do not mix unrelated features with decomposition or diagnostics.

Do not touch `pipeline.js` unless expressly approved.

Do not update DB/indexing/RAG/vector/corpus unless expressly approved.

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

Codex remains the primary implementation worker for the current Phase 6E work.

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

Claude Code is the architecture/refactor planning owner, especially before deep work on:

```text
pipeline.js
source-authority-selector.js
authority-utils.js
route/controller decomposition
memory architecture
workflow orchestration
source-governance architecture
```

### Gemini / GLM / GitHub Copilot / other coding agents

Status:

```text
PARKED
```

Use only later as optional reviewers or experiments after the relevant phase or after all TINA phases are complete.

Current rule:

```text
Do not switch primary implementation away from Codex during Phase 6E closure.
```

### External GitHub / AI Tools

The following are parked for now:

```text
Claude Cookbooks
DSPy
nanoGPT
Honeycomb
Hermes Agent
OpenDesign / opencode
Headroom
DeepSeek-R1-Distill-Qwen-14B
GLM 5.2
Gemini
GitHub Copilot Agent Mode
other external GitHub tool explorations
```

They are not abandoned, but they are deferred until the relevant later phase.

---

# Completed Phase Status

## Phase 1 â€” Core Tax Assistant

Status:

```text
COMPLETE
```

## Phase 2 â€” Retrieval Foundation

Status:

```text
COMPLETE
```

## Phase 3 â€” Authority-Aware Retrieval

Status:

```text
COMPLETE
```

## Phase 4 â€” Retrieval Integrity and Authority Discipline

Status:

```text
COMPLETE
```

## Phase 5 â€” Source Availability Engine V1

Status:

```text
COMPLETE / STAGING PASS
```

TINA reached:

```text
Authority-Safe Candidate
```

## Phase 6 â€” NIRC Metadata and Authority Normalization

Status:

```text
COMPLETE / STABILIZED
```

## Phase 6B â€” Controlled Decomposition and Registry Extraction

Status:

```text
COMPLETE / STABILIZED
```

Key result:

```text
PATCH-034A through PATCH-034H completed.
Phase 6B extracted-module behavior stable.
```

## Phase 6C â€” Known Authority Backlog Fixes

Status:

```text
COMPLETE / STABILIZED
```

Key result:

```text
PATCH-035 series completed.
TRAIN Law / RA 10963 retrieval bridge and source-card behavior stabilized.
```

## Phase 6D â€” Post-PATCH-035 Stabilization

Status:

```text
COMPLETE
```

Key result:

```text
PATCH-035D post-035 stabilization gate completed.
No DB/indexing/RAG/vector/corpus changes.
```

---

# Closed Phase

## Phase 6E - Controlled Source Authority Extraction

Status:

```text
CLOSED / PASS
```

Purpose:

```text
Continue safe JavaScript decomposition and source-authority helper extraction without changing behavior.
Preserve authority safety, sourceAvailability, source-card labels, public URLs, click targets, exact authority behavior, and guarded fallback behavior.
```

Current Phase 6E completed work:

```text
PATCH-06E-001  â€” Safe JS decomposition plan
PATCH-06E-002  â€” Source-authority selector card sanitizer extraction
PATCH-06E-002S â€” Source-card sanitizer staging smoke
PATCH-06E-003  â€” Philippine tax boundary pattern constants extraction
PATCH-06E-003S â€” Boundary pattern staging smoke
PATCH-06E-004  â€” Reranker normalizers extraction
PATCH-06E-004S â€” Reranker normalizers staging smoke
PATCH-06E-005  â€” Reranker issue-signal helpers extraction
PATCH-06E-005S â€” Reranker issue signals staging smoke
PATCH-06E-GATE-1 â€” First-wave stabilization gate
PATCH-06E-006  â€” Issue exact-authority detector extraction
PATCH-06E-006S â€” Issue exact-authority detector staging smoke
PATCH-06E-007  â€” Vector authority keyword builders extraction
PATCH-06E-007S â€” Vector authority keyword builders staging smoke
PATCH-06E-GATE-2 â€” Post-006/007 stabilization gate
PATCH-06E-008  â€” Source-authority selector eligibility extraction
PATCH-06E-008S â€” Source-authority selector eligibility staging smoke
PATCH-06E-009  â€” Ask-handler public source sanitizer extraction
PATCH-06E-009S â€” Ask-handler sanitizer staging diagnostic
PATCH-06E-009T â€” BIR Ruling DA-489-03 promotion diagnostic
PATCH-06E-010  â€” Unavailable BIR Ruling SourceAvailability Guard
PATCH-06E-010S â€” Unavailable BIR Ruling Guard Staging Smoke
PATCH-06E-GATE-3 - Phase 6E Closure Gate
```

Current pending work inside Phase 6E:

```text
None. Phase 6E is closed.
```

Optional only if closure gate identifies a remaining issue:

```text
PATCH-06E-011 â€” Last narrow extraction or diagnostic only if needed
```

---

# Latest Patch Detail

## PATCH-06E-010 â€” Unavailable BIR Ruling SourceAvailability Guard

Status:

```text
COMPLETE / PUSHED / LOCAL PASS
```

Commit:

```text
c2b6380 PATCH-06E-010 guard unavailable BIR Ruling promotion
```

Purpose:

```text
Prevent specific unavailable BIR Ruling-number queries from being promoted to AUTHORITY_FOUND through unrelated G.R./NIRC substitute cards.
```

Root-cause diagnostic from PATCH-06E-009T:

```text
Query:
What is BIR Ruling DA-489-03?

Observed staging behavior before PATCH-06E-010:
AUTHORITY_FOUND with public cards:
- G.R. No. 187485
- G.R. No. 226592
- NIRC Sec. 2

No BIR Ruling DA-489-03 source card was exposed.

Root cause:
Primary: sourceAvailability promotion gap.
Secondary: missing source / expected unavailable-source behavior and BIR Ruling exclusion gap.
Not caused by PATCH-06E-009 sanitizer extraction.

Corpus status:
BIR Ruling DA-489-03 does not exist in the staging vector-store source list.
```

Guard location:

```text
Narrow classifier-side guard in issue-classification-engine.js.
```

Guard behavior:

```text
Specific BIR Ruling-number queries now get a specific BIR Ruling signal/reference.
Non-matching/non-BIR candidates fail the existing material-authority match path.
Unrelated G.R./NIRC candidates should no longer become AUTHORITY_FOUND for unavailable specific BIR Ruling queries.
```

Files reported changed:

```text
issue-classification-engine.js
tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs
```

Note for next validation:

```text
User display also showed authority-utils.js +6/-6 in the edited file list.
Before PATCH-06E-010S, verify actual committed file list with:
git show --name-only --stat c2b6380
```

Local validation:

```text
Focused 06E-010 test: PASS
Targeted authority/source-card/EWT-WHT controls: PASS
npm test: PASS, 10 syntax checks + 65 suites, 0 failures
npm run guard:files: PASS
```

Staging validation:

```text
PASS on staging.
Deployed commit matched c2b6380.
indexingRunning=false.
Vector store remained 5,346 chunks / 102 sources.
Unavailable BIR Ruling DA-489-03 variants returned NO_INDEXED_SOURCE with zero cards and no unrelated G.R./NIRC substitute promotion.
```

Next required task:

```text
PATCH-06G-002 - Claude Code architecture review of JS module inventory and decomposition boundaries
```

---

# Immediate Next Codex Task

## PATCH-06G-002 - Claude Code architecture review of JS module inventory and decomposition boundaries

Objective:

```text
Review the PATCH-06G-001 JS module inventory and decomposition destination map before any runtime decomposition begins.
Keep pipeline.js untouched unless a later narrow patch expressly approves it.
```

---

# Current Extracted / New Modules

The following extracted modules now exist or have been added through Phase 6B and Phase 6E:

```text
source-card-engine.js
authority-restoration-engine.js
source-intent-registry.js
taxpayer-definition-registry.js
authority-alias-registry.js
vector-authority-reference-registry.js
doctrine-authority-map.js
services/source-authority-selector-card-sanitizer.js
services/philippine-tax-boundary-patterns.js
reranker-normalizers.js
reranker-issue-signals.js
issue-exact-authority-detector.js
vector-authority-keyword-builders.js
services/source-authority-selector-eligibility.js
services/ask-handler-public-source-sanitizer.js
```

---

# Phase 6F - Automated Evaluation & Regression Harness

Status:

```text
CLOSED / PASS
```

Start condition:

```text
Phase 6E is closed. PATCH-06F-001 completed the local evaluation runner skeleton.
```

Purpose:

```text
Create a permanent testing/evaluation harness inspired by evaluation-cookbook patterns, but governed for TINA.
This is not a replacement for TINA and not an external repo integration.
It is an internal evaluation layer.
```

Planned work:

```text
PATCH-06F-001 â€” Create TINA evaluation runner skeleton - COMPLETE / LOCAL PASS
PATCH-06F-001R â€” Codex crash recovery report - COMPLETE / PUSHED
PATCH-06F-002 â€” Authority/source-card regression suite - COMPLETE / LOCAL PASS
PATCH-06F-003 â€” CTA / G.R. click-target integrity tests - COMPLETE / LOCAL PASS
PATCH-06F-004 â€” Generic-query guard regression tests - COMPLETE / LOCAL PASS
PATCH-06F-005 â€” Exact-source limitation wording regression tests - COMPLETE / LOCAL PASS
PATCH-06F-006 â€” Mode-format evaluation: /ask, /tax, /audit - COMPLETE / LOCAL PASS
PATCH-06F-007 â€” Domain source-card coverage tests: EWT, VAT, PEZA, LOA - COMPLETE / LOCAL PASS
PATCH-06F-008 â€” Staging evaluation report generator - COMPLETE / LOCAL PASS
PATCH-06F-GATE-1 â€” Phase 6F Evaluation Harness Stabilization Gate - COMPLETE / LOCAL PASS
```

Critical behaviors to lock:

```text
NIRC Sec. 57 source card appears
NIRC Sec. 58 remains correct
RR 2-98 authority identity preserved
RR 12-2018 source behavior preserved
RMC 65-2012 source behavior preserved
RMO 20-2013 / RMO 24-2013 source behavior preserved
Generic EWT/WHT does not over-promote authority
Generic TRAIN query does not falsely promote RA 10963
Generic Republic Act query is rejected or guarded
BIR Ruling exclusion / unavailable-source guard remains preserved
CTA Case No. 9369 source card opens the correct case
Source-card label, public URL, and click target match
```

---

# Future Phase Roadmap

## Phase 7A â€” Human Conversational Response Layer

Status:

```text
NOT STARTED
```

Purpose:

```text
Make TINA answer like a professional tax adviser, not merely a retrieval engine.
Improve clarity, structure, tone, examples, and practical explanation while preserving authority discipline.
```

## Phase 7B â€” Analytical / Adversarial Reasoning Layer

Status:

```text
NOT STARTED
```

Purpose:

```text
Risk flags, conflicts, counterarguments, fact gaps, supersession checks, audit/litigation positioning, and adversarial review.
```

## Phase 8 â€” Memory, User Learning & Governed Tax Intelligence

Status:

```text
NOT STARTED
```

Purpose:

```text
Implement governed continuous learning, user learning, /quiz and /review progress, firm memory, client/matter memory, and Tax Guru personalization.
```

Knowledge separation rule:

```text
User questions teach TINA demand patterns and personalization.
Quiz/review results teach TINA user mastery and weaknesses.
Client/matter facts teach TINA private matter context.
Only approved source-backed materials teach TINA the law.
```

Knowledge layers:

```text
Global Knowledge:
Approved tax/legal/regulatory sources available to all users.

Firm Knowledge:
BCCPAs templates, workflows, methodology, preferred formats, internal playbooks.

User Memory:
User preferences, quiz/review history, learning weaknesses, frequent topics, answer style.

Matter Memory:
Client/entity/case-specific facts, assumptions, documents, issue history.
```

Suggested work:

```text
PATCH-08A â€” Memory governance design
PATCH-08B â€” Global vs firm vs user vs matter memory schema
PATCH-08C â€” User query learning log
PATCH-08D â€” /quiz and /review learning memory
PATCH-08E â€” Matter/client memory
PATCH-08F â€” Firm knowledge layer
PATCH-08G â€” Global knowledge promotion workflow
PATCH-08H â€” Tax Guru personalization engine
PATCH-08I â€” Memory privacy and audit trail
```

## Phase 9 â€” Professional Workflow Co-Pilot

Status:

```text
NOT STARTED
```

Purpose:

```text
Professional outputs and practice workflows.
```

Examples:

```text
BIR replies
audit defense matrices
client letters
engagement checklists
tax position memos
compliance trackers
document workflows
```

## Phase 10 â€” Regulatory Monitoring, Source Governance & Ingestion Automation

Status:

```text
NOT STARTED
```

Purpose:

```text
Controlled regulatory source monitoring, archival, approval, ingestion, metadata governance, validation, and rollback.
```

Tool roles later:

```text
Apify:
Source discovery / crawler layer for BIR, SEC, CTA, Supreme Court, DOF, PEZA, BOI, LGU and other regulatory pages.

n8n:
Workflow orchestration for scheduled monitoring, download workflows, manifest creation, checksum generation, Backblaze B2 archiving, human approval routing, ingestion queue creation, validation, notifications, and rollback.

Backblaze B2:
Source archive / standby source-of-truth storage after governance.
```

Critical rule:

```text
Apify finds.
n8n orchestrates.
B2 stores.
Human/governance approves.
TINA ingests only approved sources.
```

## Phase 11 â€” Speed, Scaling, Token, Model & Deployment Optimization

Status:

```text
NOT STARTED
```

Purpose:

```text
Token efficiency, model comparison, open-weights testing, observability, deployment optimization, and scaling.
```

Parked tools for later review:

```text
Headroom
GLM
Gemini
DeepSeek-R1-Distill-Qwen-14B
GitHub Copilot Agent Mode
Honeycomb
other model/deployment/observability tools
```

Current rule:

```text
No external tool integration during Phase 6E closure.
Headroom may be used only as developer-side token-efficiency tooling, not inside TINA runtime.
```

## Phase 12 â€” Document-Aware Advisory & Client File Intelligence

Status:

```text
NOT STARTED
```

Purpose:

```text
Client-file-aware advisory, document understanding, matter-specific answers, document-grounded workflows.
```

## Phase 13 â€” Philippine Tax Operating System / Full Tax Guru

Status:

```text
NOT STARTED
```

Purpose:

```text
Mature TINA as a Philippine Tax Operating System and full Tax Guru platform.
```

Target maturity:

```text
authority-safe retrieval
automated evaluation
human conversational layer
adversarial tax reasoning
memory and personalization
governed source ingestion
professional workflows
document intelligence
continuous regulatory monitoring
firm/client/matter knowledge
```

---

# Source Storage / Backblaze B2 Status

Current storage posture:

```text
Google Drive:
Working source repository.

Backblaze B2:
Backup / standby archive only.

MEGA:
Optional private encrypted archive.
```

Current B2 rule:

```text
Backblaze B2 is not connected to TINA ingestion yet.
No B2-to-RAG ingestion.
No automatic indexing.
No vector update.
```

Known B2 setup:

```text
Bucket:
tina-source-archive

Purpose now:
GDrive mirror / backup / standby archive

Future Phase 10 purpose:
Governed source archive and ingestion source-of-truth candidate.
```

Recommended rclone posture:

```text
Use rclone copy, not rclone sync.
Back up selected folders only, not the whole Google Drive unless expressly intended.
```

Suggested TINA source mirror:

```text
Source:
gdrive:TINA TAX LIBRARY

Destination:
b2:tina-source-archive/gdrive-mirror/raw/TINA TAX LIBRARY
```

---

# Strategic Direction

TINA is moving from:

```text
single large tax chatbot backend
```

toward:

```text
Philippine Tax Operating System / Full Tax Guru
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
client/entity/matter memory
professional-grade tax/legal operating workflows
controlled source governance
continuous user learning
```

Current objective:

```text
Continue Phase 6G authority/pipeline decomposition planning under the completed Phase 6F evaluation guard.
```

---

# Phase 6G - Authority / Pipeline Decomposition Planning Under Evaluation Guard

Status:

```text
ACTIVE
```

Purpose:

```text
Plan future authority/pipeline decomposition under the completed Phase 6F evaluation guard.
Do not start actual decomposition before inventorying existing JS modules and destination boundaries.
Do not touch pipeline.js unless expressly approved in a later narrow patch.
```

Planned work:

```text
PATCH-06G-001 - JS module inventory and decomposition destination map - COMPLETE / LOCAL PASS
PATCH-06G-002 - Claude Code architecture review of JS module inventory and decomposition boundaries - COMPLETE / LOCAL PASS
PATCH-06G-003 - Source-card wrapper equivalence test lock (test-only) - COMPLETE / LOCAL PASS
PATCH-06G-004 - Source-card wrapper collapse in pipeline.js (approved by PATCH-06G-002 review) - COMPLETE / LOCAL PASS
PATCH-06G-005 - Source-availability boundary documentation hardening - COMPLETE / LOCAL PASS
PATCH-06G-GATE-1 - Phase 6G stabilization gate
```

Immediate next task:

```text
PATCH-06G-GATE-1 - Phase 6G Stabilization Gate
```

---

# Continuity Instruction for New Chat

Continue TINA development from the latest continuity state.

Current phase:

```text
PHASE 6G - Authority / Pipeline Decomposition Planning Under Evaluation Guard
```

Current latest pushed commit:

```text
PATCH-06G-002 add Claude architecture review
```

Current status:

```text
PHASE 6F CLOSED / PASS
PHASE 6G ACTIVE
PATCH-06F-GATE-1 COMPLETE / LOCAL PASS
PATCH-06G-001 COMPLETE / LOCAL PASS
PATCH-06G-002 COMPLETE / LOCAL PASS
PATCH-06G-003 COMPLETE / LOCAL PASS
PATCH-06G-004 COMPLETE / LOCAL PASS
PATCH-06G-005 COMPLETE / LOCAL PASS
```

Immediate next Codex task:

```text
PATCH-06G-GATE-1 - Phase 6G Stabilization Gate
```

After that:

```text
No further decomposition before PATCH-06G-GATE-1 completes.
```

Key architecture findings from PATCH-06G-002:

```text
1. Wrapper adapter pattern confirmed: pipeline.js has 6 one-line delegate wrappers pointing to source-card-engine.js.
   Wrapper collapse is the safe Phase 6G decomposition path.
2. classifySourceAvailability is exported from pipeline.js and imported by 6+ test files.
   It CANNOT be moved in Phase 6G. Extraction is Phase 6H minimum.
3. source-visibility-engine.js is a utility/display module, NOT a SAE classifier.
   Do NOT route classifySourceAvailability to source-visibility-engine.js.
   Correct future destination: new dedicated source-availability-classifier.js (Phase 6H+).
4. Two SAE functions in pipeline.js: computeSourceAvailability (private) and
   classifySourceAvailability (exported). They serve different pipeline stages.
5. All retrieval, mode/response, and other decomposition is deferred (Phase 6H+).
```

Work owner rules:

```text
Codex for narrow implementation, diagnostics, tests, commits, staging validation.
Claude Code for broad architecture/refactor planning.
Gemini/GLM/Copilot/external tools parked unless expressly approved later.
```

Important current guard:

```text
Specific unavailable BIR Ruling-number queries should not be promoted to AUTHORITY_FOUND through unrelated non-BIR substitute authorities.
BIR Ruling DA-489-03 is not in the corpus and should not expose a BIR Ruling source card.
```







