# TINA Updated Controlling Roadmap v8
## Competitive Philippine Tax Operating System and Production-Readiness Strategy

**Effective date:** 27 July 2026  
**Current active work:** PHASE-10A14-R20  
**Current controlling result:** COMMIT 5R1-C30 incomplete; COMMIT 5R1-C31 continuation is next  
**Major-phase count:** 18 - unchanged  
**Strategic change:** production identity, live payments, transport security, application protection, scalability and observability are now explicit V1 release gates. TINA’s destination is unchanged.

---

## 1. Controlling strategic decision

TINA must not become a copy of a general Philippine legal-research platform.

Anycase.ai is the closest Philippine benchmark for:

- legal-source breadth;
- searchable full-text library;
- daily updating;
- citation verification;
- professional research UX;
- public product pricing;
- market validation; and
- published evaluation discipline.

TINA must meet or exceed those research disciplines.

TINA’s durable differentiation is deeper:

> **Determine, support, control, document and operationalize the correct Philippine tax treatment.**

The controlling product boundary is:

- **Anycase-type capability:** find, verify, browse and cite Philippine legal authority.
- **TINA capability:** convert taxpayer facts, transactions, books, documents and controlling authority into a governed tax position, compliance action, computation, workpaper, audit-defense record and system control.

Research is an input. Governed professional tax action is TINA’s output.

### Production-readiness rule

A feature is not production-ready merely because it works for one developer or one test user.

TINA must be designed before launch for:

- secure account creation, login, email verification and password recovery;
- live payment processing rather than test-mode billing alone;
- encrypted transport on real production domains;
- protected secrets and API keys;
- validated and rate-limited application inputs;
- bot and abuse resistance;
- bounded database reads and paginated interfaces;
- indexed and observable database access;
- non-blocking background work;
- monitored errors, slow queries and failed jobs; and
- safe growth from one user to concurrent professional users.

Pagination, database indexes, background processing and error monitoring are release engineering requirements. They are not optional improvements to be postponed until after growth.

---

## 2. Immediate execution priority

### Phase 10A remains the absolute blocker

Latest controlling execution result after COMMIT 5R1-C30:

- R3 decision score: **3,720 / 3,720**;
- R3 relation score: **3,720 / 3,720**;
- R3 reason score: **3,472 / 3,720**;
- reason-suite v8 score: **344 / 344**;
- collision-probe score: **196 / 196**;
- decision counterfactual: **756 / 756**;
- relation counterfactual: **282 / 282**;
- clause probes: **68 / 68**;
- rich-context guard: **7 / 7**;
- reason integrity: **PASS**;
- decision lock: **achieved**;
- relation lock: **achieved**;
- reason suite lock: **achieved**;
- reason layer lock: **open**; and
- runtime closure: **not achieved**.

Next exact task:

**PHASE-10A14-R20 - COMMIT 5R1-C31: R3 Reason-Layer Closure Continuation Against the Governance-Compliant C30 Base**

No market-response implementation may bypass Phase 10A. Competitive planning, architecture, benchmark design and source inventories may proceed as documentation, but runtime integration, model migration, durable memory, source promotion, production billing, public deployment and production cutover remain blocked.

## 3. Updated Phase 10

### 10A — Trust, limitation and authority-confidence closure

Close all remaining routing, decision, relation, reason, evidence and governance defects under frozen evidence. Phase 10A exits only after:

- decision, relation and reason closure;
- standalone and integrated exact gates;
- frozen runtime;
- post-freeze evidence;
- deterministic clean cycles;
- staging clean cycles;
- Codex 5.5 independent review;
- E2; and
- A15.

### 10B-M0 to 10B-M6 — Controlled model migration

Preserve Phases 1–9, introduce a model-independent adapter, benchmark approved models, route by risk and economics, activate in staging and lock the selected production configuration.

### 10B-T — Canonical Philippine Tax Terminology and Forms Registry V1

Deterministically recognize:

- BIR acronyms;
- forms and schedules;
- attachments;
- filing systems;
- notices;
- legacy and current terms;
- aliases; and
- materially ambiguous expansions.

Invented expansion count must remain zero.

### 10B — Tax accuracy and coverage expansion

Expand validated tax-domain coverage using typed skills, controlled authority classes and positive, negative, temporal, exception, form and procedure tests.

### 10C — Tax ontology and proposition-level grounding

Map each decisive proposition to:

- exact passage;
- authority class;
- conditions;
- taxpayer and transaction applicability;
- effectivity;
- supersession; and
- limitations.

A citation that merely discusses the topic does not verify the proposition.

### 10C-T — Contextual acronym resolution

Resolve a term through the approved registry and actual context before substantive reasoning. Unknown or materially ambiguous terms must clarify or fail closed.

### 10D — Legal/tax safety, reliance and human escalation

Control:

- professional reliance;
- scope;
- assumptions;
- disclaimers;
- confidentiality;
- reviewer and approver roles;
- disagreement; and
- high-risk escalation.

### 10E — Security, privacy and enterprise confidentiality

The release scope expressly includes:

- tenant and matter isolation;
- provider and subprocessor disclosure;
- retention and deletion;
- encryption;
- access audit;
- secret management;
- abuse protection;
- safe errors;
- incident response; and
- enterprise confidentiality testing.

Security controls must be proven on the exact release candidate and not assumed from local or staging behavior.

### 10E-A — Identity, account and session security V1

Implement and validate:

- account registration;
- login and logout;
- secure password hashing;
- password reset requests and expiring single-use reset links;
- email verification before protected or paid access;
- resend-verification controls;
- session creation, rotation, expiration and revocation;
- protection against account enumeration;
- failed-login throttling and lockout controls;
- secure cookies or equivalent token storage;
- explicit sign-out from active sessions;
- recovery-path audit events; and
- user-visible handling of expired, invalid or already-used links.

Production identity must fail closed. Passwords, reset tokens, verification tokens and session credentials must never be logged in plaintext.

### 10E-B — Application, API and abuse protection V1

Implement and validate:

- server-side input validation for every externally controlled field;
- schema validation for API requests and uploaded metadata;
- length, type, range, enum and format limits;
- canonicalization rules where required;
- rejection of unexpected fields for sensitive operations;
- file-type, size and content controls;
- output encoding and safe error responses;
- rate limiting by endpoint risk;
- stricter limits for login, registration, password reset, verification, uploads and AI queries;
- bot protection for public forms and abuse-prone endpoints;
- replay protection for sensitive actions;
- idempotency where duplicate requests can cause material effects;
- origin, CORS and request-method controls;
- abuse logging without exposing secrets or privileged content; and
- load tests proving that protections do not create denial-of-service vulnerabilities.

Rate limits must distinguish ordinary use, burst use, authenticated professional use and abusive automation.

### 10E-C — Production transport, domain and secret boundary V1

Before any public or paid release:

- use a real production domain;
- enforce valid TLS/SSL certificates;
- redirect all HTTP traffic to HTTPS;
- apply secure transport headers appropriate to the application;
- verify certificate renewal and domain ownership;
- separate development, staging and production credentials;
- keep all privileged API keys and payment secrets server-side;
- prevent secrets from entering frontend bundles, source maps, logs, screenshots or public repositories;
- scan repositories and deployment artifacts for exposed secrets;
- rotate any credential suspected of exposure;
- restrict secrets by environment, scope and least privilege;
- document emergency rotation and revocation; and
- verify that browser network traffic exposes no privileged provider key.

“No exposed API keys” is a tested release condition, not a coding convention.

### 10F — Performance, resilience and model economics

Validate:

- latency;
- concurrency;
- throughput;
- cost;
- caching;
- outages;
- backup and restore;
- rollback;
- degraded-mode behavior; and
- peak tax-deadline conditions.

Single-user responsiveness is not sufficient evidence. The release candidate must be tested under realistic concurrent use and realistic matter sizes.

### 10F-A — Pagination, bounded reads and database scalability V1

Implement and validate:

- server-side pagination for all potentially unbounded lists;
- deterministic ordering and stable pagination cursors or bounded page offsets;
- default and maximum page sizes;
- bounded search and export operations;
- database indexes for actual filter, join, sort and lookup patterns;
- query-plan inspection for critical paths;
- slow-query thresholds and reporting;
- N+1 query detection;
- query timeout and cancellation controls;
- connection-pool sizing and exhaustion behavior;
- avoidance of loading thousands of records into a browser or application process;
- archival or partition strategy where tables can grow materially;
- data-retention effects on query performance; and
- load tests using realistic record counts, not empty development databases.

No production endpoint may return an unbounded matter, source, message, audit-log, transaction or user collection.

### 10F-B — Background tasks and request-path isolation V1

Move expensive, retryable or long-running work away from synchronous user requests where appropriate, including:

- document extraction;
- OCR;
- ingestion preparation;
- large exports;
- email delivery;
- payment-event handling;
- report generation;
- bulk evaluations;
- notifications; and
- other work that can exceed the safe request budget.

Background processing must include:

- durable job state;
- idempotency;
- bounded retries with backoff;
- timeout and cancellation;
- dead-letter or failed-job handling;
- concurrency controls;
- progress or status reporting;
- worker health checks;
- duplicate-delivery safety;
- auditability; and
- recovery after worker or provider failure.

A web request must not remain blocked merely because a separable expensive task is running.

### 10F-C — Error monitoring and release observability V1

Before controlled beta, implement:

- centralized structured error capture;
- correlation or request identifiers;
- route and operation context;
- deployment-version identification;
- redaction of taxpayer data, credentials and secrets;
- frontend and backend error monitoring;
- API latency and error-rate metrics;
- database slow-query monitoring;
- queue depth, age and failure monitoring;
- background-job duration and retry monitoring;
- authentication and abuse-control signals;
- payment-webhook and reconciliation failures;
- external provider failures;
- alert thresholds and ownership;
- health, readiness and dependency checks; and
- evidence that alerts reach a responsible person.

Critical failures must be discoverable without waiting for a user complaint.

### 10G-A — Professional Workspace UI V1

Modern matter-oriented workspace with search, history, projects or tax matters, mode selection, uploads, source presentation and review state.

The user-facing account experience must include:

- registration;
- login;
- logout;
- email-verification status;
- resend verification;
- forgot-password flow;
- reset-password flow;
- expired-link handling;
- session-expiry handling;
- account and security settings;
- clear billing status; and
- accessible loading, error and recovery states.

### 10G-B — Multimodal Tax-Document Intake V1

Securely read images, scanned PDFs, spreadsheets, CSV, Word and text while preserving page, sheet and cell provenance. Extracted content is not automatically a confirmed fact or legal authority.

### 10G-C0 to 10G-C14 — Professional Human Tax OS

Identity, session continuity, follow-up intent, contextual reconstruction, ambiguity handling, user-objective discovery, fact gaps, issue spotting, next-best action, correction handling, matter isolation, memory boundaries and professional usefulness.

### 10G-D1 — Searchable Philippine Tax Authority Library V1 — accelerated

Provide browse-first access independent of chat:

- authority-class filters;
- tax type and agency filters;
- date and status;
- canonical, historical, superseded and pending-review labels;
- full-text reader;
- download; and
- source metadata.

All result lists must use bounded, tested pagination.

### 10G-D2 — Citation Verification, Reader and Export V1 — accelerated

Every material answer should support:

**Answer → proposition → exact passage → authority metadata → full source**

Add citation-ready copying and professional source packages.

Large exports must use bounded or background generation rather than blocking normal requests.

### 10G-D3 — Daily Authority Monitoring Pilot — accelerated

Monitor BIR, CTA, Supreme Court, DOF, BOC, FIRB and approved sources daily.

The pilot may automate:

- discovery;
- exact-copy preservation;
- checksums;
- duplicate detection;
- quarantine; and
- review queues.

It may not automatically promote a source to canonical truth.

### 10H — Locked release-candidate adversarial evaluation

Attack the exact production candidate for:

- hallucination;
- incompleteness;
- legal conflict;
- unsafe routing;
- authentication and account-recovery defects;
- authorization and tenant-isolation defects;
- input-validation bypass;
- rate-limit and bot-protection bypass;
- exposed secrets;
- payment duplication or webhook forgery;
- privacy;
- unbounded query and pagination defects;
- background-job failure;
- observability blind spots;
- workflow defects; and
- professional-usefulness defects.

### 10H-T — Terminology and forms adversarial gate

Attack similar acronyms, obsolete forms, current versus legacy systems, concepts versus forms and invented expansions.

### 10H-B — Public Philippine Tax Benchmark V1

Publish a reproducible tax benchmark covering:

- fabricated authority identifiers;
- citation verifiability;
- proposition-source sufficiency;
- complete authority coverage;
- effectivity and supersession;
- tax-treatment accuracy;
- form and deadline accuracy;
- computation reproducibility;
- unsafe routing;
- professional usefulness;
- correction responsiveness; and
- privacy/isolation.

Vendor-run and independent results must be reported separately.

### 10I-P — Production billing and real-payment readiness

Before accepting real money:

- activate the approved payment provider in live mode;
- separate test and live credentials;
- keep live secret keys server-side;
- verify signed payment webhooks;
- use idempotency to prevent duplicate charges and duplicate provisioning;
- reconcile provider events, internal billing records and access entitlements;
- handle successful, pending, failed, disputed, refunded and cancelled payments;
- produce appropriate receipts or billing records;
- verify pricing, taxes and currency presentation;
- define refund and cancellation procedures;
- minimize payment-card data scope;
- never store raw card numbers or security codes in TINA;
- test live-mode failure and recovery using controlled low-value transactions;
- restrict production payment access until owner approval; and
- monitor payment, webhook and entitlement failures.

Passing a provider’s test mode is not evidence that production billing is ready.

### 10I — Final V1 production gate

No production cutover without complete evidence for:

- trust and authority accuracy;
- terminology;
- model configuration;
- legal and professional reliance controls;
- secure registration, login, logout and password reset;
- email verification;
- session security;
- TLS/SSL on the real production domain;
- no exposed privileged API keys or secrets;
- server-side input validation;
- rate limiting and bot protection;
- live payment processing and reconciliation;
- pagination and bounded database reads;
- database indexes and slow-query controls;
- background-task isolation;
- error monitoring and alerting;
- privacy and tenant isolation;
- performance and capacity;
- user experience;
- benchmark performance;
- backup, restore and rollback;
- production support ownership; and
- owner approval.

A missing production-readiness gate blocks cutover even when the tax-answering system passes.

### 10I-C — Controlled professional beta, pricing and market validation

Before broad launch, use controlled CPA, tax-practitioner and in-house tax cohorts to measure:

- activation;
- registration completion;
- email-verification completion;
- login and account-recovery success;
- professional usefulness;
- paid conversion;
- payment success and failure;
- four-week retention;
- matter completion;
- error escape;
- willingness to pay;
- support load;
- performance under real record volumes; and
- failure reasons.

Commercial evidence may prioritize product work. It cannot override a trust, security, privacy, payment-integrity or reliability failure.

---

## 4. Updated Phase 11

Phase 11 becomes:

**Operational Assurance, Market Validation, Continuous Evaluation and Growth**

In addition to observability, incident response, expert review, feedback, pricing and scale, operate:

- authentication and account-recovery monitoring;
- rate-limit and bot-abuse monitoring;
- secret and certificate-expiry monitoring;
- payment reconciliation and entitlement monitoring;
- API latency, error and saturation monitoring;
- database query and index health;
- queue and worker health;
- background-job failures and retries;
- frontend and backend error monitoring;
- capacity forecasts;
- backup and restore exercises;
- incident response; and
- post-incident corrective actions.

### 11N — Daily Source Operations Pilot

Operate the daily discovery, preservation and review queue under production conditions. Measure freshness, reviewer workload, source failures, recall and rollback.

### 11O — Competitive Intelligence and Product Evidence Loop

Maintain a quarterly evidence-based scorecard covering:

- corpus breadth;
- source freshness;
- search and reader UX;
- citation verification;
- tax-operational depth;
- benchmark performance;
- authentication reliability;
- privacy;
- security;
- payment reliability;
- performance;
- pricing;
- adoption;
- retention; and
- user win/loss reasons.

Anycase is a benchmark, not TINA’s product specification.

### 11P — Production reliability and capacity operations

Operate continuing controls for:

- service-level indicators and objectives;
- latency percentiles;
- error budgets;
- database slow-query trends;
- index effectiveness;
- connection-pool saturation;
- pagination abuse;
- queue depth and job age;
- worker capacity;
- payment-event lag;
- email-delivery failures;
- login and reset abuse;
- TLS certificate renewal;
- secret rotation;
- dependency outages;
- capacity testing before tax deadlines; and
- scaling and rollback decisions.

Observability must identify what failed, where it failed, which release introduced it and whether taxpayer or payment data was affected.

---

## 5. Updated Phase 12

Phase 12 becomes:

**Governed Daily Authority Operations, Tax Lexicon and Philippine Tax Graph**

The production operation covers:

1. approved official-source registry and health checks;
2. daily discovery;
3. exact official copies and checksums;
4. OCR and structural cleanup;
5. metadata and authority classification;
6. effectivity, amendment and supersession;
7. canonical terminology and forms;
8. proposition and passage indexing;
9. staging promotion and regression;
10. authorized canonical promotion;
11. recall, correction and rollback;
12. temporal citator;
13. Tax Graph and lineage;
14. coverage and gap analytics; and
15. professional library and reader operations.

Target discipline:

- daily source checking;
- approximately 24-hour discovery target for monitored sources;
- no unapproved canonical promotion;
- immutable history;
- complete provenance;
- human approval;
- regression before promotion;
- paginated and indexed authority access;
- background processing for expensive source operations; and
- complete monitoring of discovery, extraction, indexing and promotion failures.

---

## 6. Updated Phase 13 — TINA’s decisive moat

Phase 13 remains:

**Full Philippine Tax Operating System and Tax Brain Ecosystem**

New explicit workstreams:

### 13V — Taxpayer and Transaction Tax-Mapping Engine

Determine:

- taxpayer classification;
- transaction character;
- tax types;
- situs and period;
- applicable rates;
- exemptions;
- withholding;
- documentation;
- forms;
- deadlines;
- accounting impact;
- assessment exposure; and
- remedies.

### 13W — Professional Tax Position and Workpaper System

Generate reviewable, source-linked:

- tax position memoranda;
- assumptions;
- issue trees;
- computations;
- checklists;
- document requests;
- reviewer comments;
- approvals;
- version history; and
- reliance controls.

### 13X — Accounting-to-Tax Control and Reconciliation

Connect:

- general ledger;
- invoices;
- payroll;
- financial statements;
- contracts;
- returns; and
- supporting evidence.

Produce book-tax differences, journal entries, reconciliations and traceable return support.

### 13Y — Tax Control API and Embedded Decision Services

Provide versioned, permissioned tax-treatment decisions to accounting, ERP, SaaS and filing ecosystems, with source packages, review state, audit logs and rollback.

Other systems process transactions. TINA supplies the governed Philippine tax brain.

The API must preserve:

- validated inputs;
- scoped credentials;
- rate limiting;
- tenant isolation;
- idempotency;
- pagination;
- versioning;
- monitoring;
- bounded background work; and
- revocable access.

### 13Z — Enterprise Matter Security and Confidentiality

Provide matter-grade:

- isolation;
- retention;
- deletion;
- encryption;
- access control;
- subprocessor disclosure;
- audit logs;
- incident controls; and
- privileged or sensitive matter handling.

---

## 7. Public benchmark and production-readiness targets

These are targets, not current claims:

| Metric | V1 target |
|---|---:|
| Fabricated authority identifiers | 0 |
| Material citation verifiability | 100% |
| Proposition-source sufficiency | at least 98%; 100% for critical classes |
| Complete authority coverage | at least 95% |
| Effectivity and supersession accuracy | 100% benchmark cases |
| Tax-treatment accuracy | at least 95% |
| Critical form and deadline accuracy | 100% |
| Deterministic computation reproducibility | 100% |
| Material false allow/refusal | 0 |
| Expert usefulness | at least 4.3/5 |
| Validated correction and regression | 100% |
| Cross-user or cross-matter leakage | 0 |
| Critical account flows passing | 100% |
| Email-verification and password-reset critical paths | 100% |
| Privileged API keys exposed to browser, bundle, log or repository | 0 |
| Production HTTP endpoints without enforced HTTPS | 0 |
| Critical API inputs lacking server-side validation | 0 |
| Public high-risk endpoints lacking approved rate limits | 0 |
| Unbounded production collection endpoints | 0 |
| Critical database access paths without reviewed indexes | 0 |
| Accepted payment events unreconciled beyond approved window | 0 |
| Duplicate charges caused by TINA | 0 |
| Critical background jobs without failure visibility | 0 |
| Critical production errors without monitoring ownership | 0 |

A full “Philippine Tax Guru” claim remains blocked until independent expert testing and real-matter replay pass.

A “production-ready” claim remains blocked until identity, payment, TLS, secret protection, validation, abuse protection, scalability, background processing and observability gates pass on the exact release candidate.

---

## 8. Controlled market launch

### Design partners

Three to five CPA or tax firms using private controlled matters for research, verification, tax-position and review workflows.

Design-partner access may use controlled non-public provisioning, but identity, tenant isolation, secure transport and monitoring remain mandatory.

### Closed professional beta

Twenty to fifty CPAs, tax practitioners and in-house tax professionals.

Possible individual pricing tests:

- lower professional entry tier;
- full professional tier; and
- team or reviewer tier.

Pricing must be based on workflow value, not only chat credits.

Before accepting paid beta users, the production-payment gate must pass. Test-mode payments are insufficient.

### Firm pilots

Preparer-reviewer-approver workflows, source packages, matter audit trails, billing controls and confidentiality controls.

### Tax Brain pilots

Limited accounting or ERP integrations only after Phase 13 API, permission, validation, rate-limit, review and rollback gates pass.

### Broad launch

Only after the benchmark, identity, security, live payment, reliability, observability, performance, support, professional-usefulness and owner cutover gates pass.

---

## 9. Strategic non-negotiables

1. **Finish Phase 10A without compromise.**
2. **Match the professional research UX expected by the market.**
3. **Automate discovery, not legal truth.**
4. **A citation is not sufficient unless it supports the proposition.**
5. **Never invent a tax term, acronym or form expansion.**
6. **Do not become a general legal-research clone.**
7. **Do not become a general accounting system.**
8. **Model explains; deterministic engines compute and control.**
9. **No autonomous filing or high-stakes release.**
10. **Commercial demand cannot override trust, security or legal accuracy.**
11. **User feedback and outcomes are improvement signals—not legal authority.**
12. **Every important change must remain versioned, testable, reviewable and reversible.**
13. **No production access without secure identity, verified email and recoverable accounts.**
14. **No real-money launch while payment processing remains in test mode.**
15. **No production endpoint without TLS, secret protection, validation and appropriate abuse controls.**
16. **No unbounded collection queries or pages that load uncontrolled record volumes.**
17. **Expensive separable work must not block normal request handling.**
18. **A critical failure that cannot be detected and attributed is a release failure.**

---

## 10. Updated overall sequence

1. Phases 1–9 — preserved foundation.
2. Phase 10A — close R20 and the remaining Phase 10A gates.
3. Phase 10B-M / 10B-T / 10B / 10C / 10C-T.
4. Phase 10D.
5. Phase 10E / 10E-A / 10E-B / 10E-C identity, security, API protection, TLS and secrets.
6. Phase 10F / 10F-A / 10F-B / 10F-C performance, pagination, indexes, background work and observability.
7. Phase 10G-A / B / C / D professional workspace, account UX, document intake and authority library.
8. Phase 10H / 10H-T / 10H-B adversarial and benchmark gates.
9. Phase 10I-P live payment readiness.
10. Phase 10I final production gate.
11. Phase 10I-C controlled professional beta and market validation.
12. Phase 11 operational assurance, market validation, daily-source pilot and capacity operations.
13. Phase 12 production authority operations, lexicon and Tax Graph.
14. Phase 13 full Tax Operating System and Tax Brain ecosystem.
15. Phase 14 mobile application after Phase 13 maturity.
16. Phase 15 continuous governed operations.
17. Phase 16 bounded agent mesh.
18. Phase 17 30-year institutional continuity.
19. Phase 18 TINA Academy and professional education ecosystem.

The major-phase count remains **18**. The expanded sequence adds release-gate subphases; it does not add or renumber the major phases.

The v8 change makes production identity, real payments, encrypted transport, secret protection, application abuse controls, database scalability, background processing and observability explicit blockers. It does not change TINA’s ultimate mission.

## 11. Immediate Source Of Truth

Use this source-of-truth hierarchy:

1. committed Git evidence and frozen artifacts
2. knowledge/CURRENT_STATE.md for immediate operational continuity
3. knowledge/TINA_Updated_Controlling_Roadmap_v8.md for controlling strategy and sequencing
4. knowledge/TINA_Updated_Roadmap_v7.md as an immutable historical predecessor
5. older workbooks and conversation continuity as non-controlling context

Roadmap v8 supersedes Roadmap v7 strategically. Roadmap v7 remains historical and immutable.

