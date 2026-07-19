// PHASE-10A14-R6: Section 51 temporal card propagation, Section 51-A statutory
// origin, and event-aware historical resolution.
//
// Covers R5-review P1 findings:
//  P1-R5-001 amendment-chain metadata reaches the sanitized public source card
//  P1-R5-003 Section 51-A originating law is RA 10963 (RA 8424 = base code only)
//  P1-R5-004 event-aware historical resolution (not-yet-effective law not applied)
// plus P2-R4-003 imperative-filing regression preservation.

import assert from "node:assert/strict";
import {
  resolveSection51AuthorityChain,
  buildSection51AmendmentChainMetadata
} from "../section51-authority-chain.js";
import { sanitizePublicSourceCard } from "../services/ask-handler-public-source-sanitizer.js";
import { detectFilingAndEstatePropositions } from "../services/answer-support-validator.js";

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}`); console.error(e?.stack || e); }
}

// ── P1-R5-003: Section 51-A statutory origin ──────────────────────────────
await test("Sec 51-A originating law is RA 10963 (created 51-A), base code RA 8424", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "substituted_filing" });
  assert.equal(r.originatingLaw, "RA 10963");
  assert.equal(r.baseCode, "RA 8424");
  const ids = r.officialLaws.map((l) => l.id);
  assert.ok(ids.includes("RA 10963"), "official laws include RA 10963");
});
await test("Sec 51-A card metadata: originatingLaw RA 10963, not RA 8424", () => {
  const m = buildSection51AmendmentChainMetadata("NIRC Sec. 51-A");
  assert.equal(m.originatingLaw, "RA 10963");
  assert.equal(m.baseCode, "RA 8424");
});
await test("Sec 51 obligation originating law is RA 8424 (existed since 1997)", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_obligation" });
  assert.equal(r.originatingLaw, "RA 8424");
});

// ── P1-R5-004: event-aware historical resolution ──────────────────────────
await test("2023 ordinary obligation: RA 11976/12214 not-yet-effective, not amending", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_obligation", taxableYear: 2023 });
  assert.ok(!r.amendingAuthorities.includes("RA 11976"), "RA 11976 not applied to 2023");
  assert.ok(!r.amendingAuthorities.includes("RA 12214"), "RA 12214 not applied to 2023");
  assert.ok(r.notYetEffective.includes("RA 11976"), "RA 11976 recorded not-yet-effective");
  assert.equal(r.chainStatus, "HISTORICAL_COMPLETE_CHAIN");
});
await test("2024 ordinary obligation: RA 11976 effective, RA 12214 not-yet-effective", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_obligation", taxableYear: 2024 });
  assert.ok(r.amendingAuthorities.includes("RA 11976"), "RA 11976 effective for 2024");
  assert.ok(r.notYetEffective.includes("RA 12214"), "RA 12214 not-yet-effective for 2024");
});
await test("current ordinary obligation: all reviewed laws effective", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_obligation" });
  assert.equal(r.notYetEffective.length, 0);
  assert.equal(r.chainStatus, "BASE_PROVISION_UNCHANGED_BUT_CHAIN_REVIEWED");
});
// R8 (P1-R7-IR-003): 51(C)(2) resolves by strict transactionDate, not by taxableYear.
await test("transaction 51(C)(2): pre-effectivity historical, post-effectivity later-amendment, no-date fails closed", () => {
  assert.equal(resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", transactionDate: "2024-06-01" }).chainStatus, "HISTORICAL_COMPLETE_CHAIN");
  assert.equal(resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", transactionDate: "2026-01-15" }).chainStatus, "LATER_AMENDMENT_REQUIRED");
  const noDate = resolveSection51AuthorityChain({ propositionClass: "filing_deadline_transaction", taxableYear: 2026 });
  assert.equal(noDate.reason, "section_51c2_transaction_date_required");
  assert.deepEqual(noDate.applicableAmendments, []);
});
await test("filing-event date drives resolution when no taxableYear", () => {
  const r = resolveSection51AuthorityChain({ propositionClass: "filing_obligation", filingEventDate: "2023-04-10" });
  assert.equal(r.resolvedYear, 2023);
  assert.ok(!r.amendingAuthorities.includes("RA 11976"));
});

// ── P1-R5-001: amendment-chain reaches the sanitized public card ──────────
await test("public card: Sec 51 carries chainReviewed=true + status", () => {
  const c = sanitizePublicSourceCard({ normalizedReference: "NIRC Sec. 51", label: "NIRC Sec. 51" });
  assert.equal(c.amendmentChainReviewed, true);
  assert.equal(c.chainReviewed, true);
  assert.ok(c.amendmentChain && c.amendmentChain.chainStatus);
  assert.equal(c.amendmentChain.originatingLaw, "RA 8424");
});
await test("public card: Sec 51-A carries originatingLaw RA 10963", () => {
  const c = sanitizePublicSourceCard({ normalizedReference: "NIRC Sec. 51-A", label: "NIRC Sec. 51-A" });
  assert.equal(c.amendmentChainReviewed, true);
  assert.equal(c.amendmentChain.originatingLaw, "RA 10963");
  assert.ok(c.amendmentChain.officialLaws.some((l) => l.id === "RA 10963"));
});
await test("public card: non-Section-51 card carries NO amendment chain (no false claim)", () => {
  const c = sanitizePublicSourceCard({ normalizedReference: "NIRC Sec. 24", label: "NIRC Sec. 24" });
  assert.notEqual(c.amendmentChainReviewed, true);
  assert.equal(c.amendmentChain, undefined);
});
await test("public card: no internal identifiers / filenames leak into chain summary", () => {
  const c = sanitizePublicSourceCard({ normalizedReference: "NIRC Sec. 51", source: "01-tax-code/nirc-1997-ra-10963-(bir).pdf" });
  const blob = JSON.stringify(c);
  assert.ok(!/\.pdf/i.test(blob), "no filename in public card");
  assert.ok(!/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}/i.test(blob), "no uuid in public card");
});

// ── P2-R4-003: imperative-filing regression preservation ──────────────────
await test("imperative 'File the annual income-tax return.' -> filing_obligation preserved", () => {
  const sem = detectFilingAndEstatePropositions("What should the taxpayer do?", "File the annual income-tax return.");
  assert.equal(sem.filingObligation, true);
});
await test("non-return imperative 'File a protest.' does NOT overfire", () => {
  const sem = detectFilingAndEstatePropositions("What should the taxpayer do?", "File a protest with the BIR.");
  assert.equal(sem.filingObligation, false);
});
await test("descriptive 'late filing may incur penalties' remains non-imperative", () => {
  const sem = detectFilingAndEstatePropositions("What penalty applies?", "Late filing of the annual income tax return may incur a 25% surcharge and interest.");
  assert.equal(sem.filingObligation, false);
});

console.log(`\nphase-10a14-r6: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
