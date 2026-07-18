// FILE: section51-authority-chain.js
// PHASE-10A14-R5/R6: Governed Section 51 / 51-A amendment-chain resolver.
//
// DERIVED GOVERNANCE OBJECT, not an official consolidated statute. Links the official
// amendment identifiers (RA 8424 / 10963 / 11976 / 12214) to each Section 51
// proposition so the runtime can (a) record that the later amendment chain was
// reviewed, (b) present amendment-chain metadata on source cards instead of implying
// "RA 10963 is the only current authority", and (c) drive a narrow temporal gate.
//
// R6 corrections:
//  - P1-R5-003: Section 51-A ORIGINATING statutory authority is RA 10963 (TRAIN),
//    which created 51-A; RA 8424 is base-code lineage only, NOT the origin of 51-A.
//  - P1-R5-004: event-aware historical resolution -- a law that was not yet effective
//    for the resolved period is classified notYetEffective, never applicable/controlling.
//
// Grounded in official-source verification: evaluation/results/phase-10a14-r5/official-amendment-chain.md
// (lawphil / Official Gazette / BIR). No statute text is fabricated.
//
// SCOPE: Section 51 authority chain only. NOT the Phase 12L temporal citator.

"use strict";

// Official amendment records (identifiers + canonical URLs + effectivity only).
export const SECTION51_OFFICIAL_LAWS = Object.freeze({
  "RA 8424": Object.freeze({ title: "NIRC of 1997", approved: "1997-12-11", effectivity: "1998-01-01", effectivityYear: 1998, url: "https://lawphil.net/statutes/repacts/ra1997/ra_8424_1997.html" }),
  "RA 10963": Object.freeze({ title: "TRAIN Law", approved: "2017-12-19", effectivity: "2018-01-01", effectivityYear: 2018, url: "https://lawphil.net/statutes/repacts/ra2017/ra_10963_2017.html" }),
  "RA 11976": Object.freeze({ title: "Ease of Paying Taxes (EOPT) Act", approved: "2024-01-05", effectivity: "2024-01-22", effectivityYear: 2024, url: "https://lawphil.net/statutes/repacts/ra2024/ra_11976_2024.html" }),
  "RA 12214": Object.freeze({ title: "Capital Markets Efficiency Promotion Act (CMEPA)", approved: "2025-05-29", effectivity: "2025-07-01", effectivityYear: 2025, url: "https://lawphil.net/statutes/repacts/ra2025/ra_12214_2025.html" })
});

const CURRENT_YEAR = new Date().getFullYear();
const CHAIN_ID = "SEC51-CHAIN-2026-07 (RA 8424 -> 10963 -> 11976 -> 12214)";

// Proposition-level model (officially verified — see WS2 record).
// originatingLaw = the statute that CREATED the proposition's provision.
// reviewedAmendments = later laws reviewed; `amendsThis` marks those that actually
// change THIS proposition (vs. reviewed-but-not-applicable).
export const SECTION51_AMENDMENT_CHAIN = Object.freeze([
  Object.freeze({
    propositionClass: "filing_obligation", subprovision: "51(A)",
    baseCode: "RA 8424", originatingLaw: "RA 8424", originatingEffectivity: "1998-01-01",
    reviewedAmendments: Object.freeze([
      Object.freeze({ id: "RA 10963", amendsThis: false }),
      Object.freeze({ id: "RA 11976", amendsThis: false }),
      Object.freeze({ id: "RA 12214", amendsThis: false })
    ]),
    baseStatus: "BASE_PROVISION_UNCHANGED_BUT_CHAIN_REVIEWED",
    note: "Ordinary filing obligation exists since RA 8424; EOPT changed manner/venue + OCW exemption only; CMEPA changed 51(C)(2) only. Obligation rule unchanged."
  }),
  Object.freeze({
    propositionClass: "filing_deadline", subprovision: "51(C)(1)",
    baseCode: "RA 8424", originatingLaw: "RA 8424", originatingEffectivity: "1998-01-01",
    reviewedAmendments: Object.freeze([
      Object.freeze({ id: "RA 11976", amendsThis: false }),
      Object.freeze({ id: "RA 12214", amendsThis: false })
    ]),
    baseStatus: "CURRENT_COMPLETE_CHAIN",
    note: "April 15 annual deadline unchanged by RA 11976 / RA 12214."
  }),
  Object.freeze({
    propositionClass: "filing_deadline_transaction", subprovision: "51(C)(2)",
    baseCode: "RA 8424", originatingLaw: "RA 8424", originatingEffectivity: "1998-01-01",
    reviewedAmendments: Object.freeze([
      Object.freeze({ id: "RA 12214", amendsThis: true })
    ]),
    baseStatus: "LATER_AMENDMENT_REQUIRED",
    note: "CGT / transaction-specific 30-day return updated by CMEPA (RA 12214, eff. 2025)."
  }),
  Object.freeze({
    propositionClass: "substituted_filing", subprovision: "51-A",
    // P1-R5-003: Section 51-A was CREATED by RA 10963 (TRAIN); base code is RA 8424.
    baseCode: "RA 8424", originatingLaw: "RA 10963", originatingEffectivity: "2018-01-01",
    reviewedAmendments: Object.freeze([
      Object.freeze({ id: "RA 11976", amendsThis: false }),
      Object.freeze({ id: "RA 12214", amendsThis: false })
    ]),
    baseStatus: "CURRENT_COMPLETE_CHAIN",
    note: "Section 51-A created by RA 10963; substituted-filing conditions unchanged by RA 11976 / RA 12214."
  })
]);

function normProp(propositionClass = "", subprovision = "") {
  const p = String(propositionClass || "").toLowerCase();
  const s = String(subprovision || "").toLowerCase();
  if (/substitut/.test(p) || /51-?a/.test(s)) return "substituted_filing";
  if (/transaction|capital|cgt|share|real property/.test(p) || /51\(c\)\(2\)/.test(s)) return "filing_deadline_transaction";
  if (/deadline/.test(p) || /51\(c\)/.test(s)) return "filing_deadline";
  return "filing_obligation";
}

function lawRecord(id) {
  return { id, ...(SECTION51_OFFICIAL_LAWS[id] || {}) };
}

// Resolve the period the proposition is being asserted for. filingEventDate /
// transactionDate / legalAsOfDate are distinct facts; a bare taxableYear governs the
// ordinary-period case. Returns a year (number) or null when unresolved.
function resolveAsOfYear({ taxableYear, filingEventDate, transactionDate, legalAsOfDate } = {}) {
  if (taxableYear != null && Number.isFinite(Number(taxableYear))) return Number(taxableYear);
  for (const d of [transactionDate, filingEventDate, legalAsOfDate]) {
    const y = d ? new Date(d).getUTCFullYear() : NaN;
    if (Number.isFinite(y)) return y;
  }
  return null;
}

/**
 * Resolve the operative Section 51 authority set for a proposition + period, event-aware.
 * Pure. Partitions each reviewed later law into applicable / reviewedButNotApplicable /
 * notYetEffective for the resolved period, and never treats a not-yet-effective law as
 * controlling (P1-R5-004).
 */
export function resolveSection51AuthorityChain(input = {}) {
  const { propositionClass = "filing_obligation", subprovision = "" } = input;
  const key = normProp(propositionClass, subprovision);
  const entry = SECTION51_AMENDMENT_CHAIN.find((e) => e.propositionClass === key) || SECTION51_AMENDMENT_CHAIN[0];

  const resolvedYear = resolveAsOfYear(input);
  // For status/currentness purposes, an unresolved period is treated as "current"
  // EXCEPT for later-amendment propositions, where the period is material and its
  // absence is reported as a temporal-fact gap.
  const asOfYear = resolvedYear != null ? resolvedYear : CURRENT_YEAR;

  const applicableAmendments = [];
  const reviewedButNotApplicable = [];
  const notYetEffective = [];
  for (const rev of entry.reviewedAmendments) {
    const eff = SECTION51_OFFICIAL_LAWS[rev.id]?.effectivityYear ?? 9999;
    if (eff > asOfYear) notYetEffective.push(rev.id);
    else if (rev.amendsThis) applicableAmendments.push(rev.id);
    else reviewedButNotApplicable.push(rev.id);
  }

  // Legacy field kept for backward compatibility: later laws effective for the period.
  const amendingAuthorities = [...applicableAmendments, ...reviewedButNotApplicable];

  // originating law is part of the controlling set for 51-A (RA 10963).
  const originatingIsLater = entry.originatingLaw !== "RA 8424";
  const currentAuthoritySet = key === "filing_deadline_transaction"
    ? ["NIRC Sec. 51(C)", ...applicableAmendments]
    : (key === "filing_deadline" ? ["NIRC Sec. 51(C)"]
      : (key === "substituted_filing" ? ["NIRC Sec. 51-A"] : ["NIRC Sec. 51"]));

  const officialLaws = [
    lawRecord(entry.baseCode),
    ...(originatingIsLater ? [lawRecord(entry.originatingLaw)] : []),
    ...entry.reviewedAmendments.map((r) => lawRecord(r.id))
  ];

  const base = {
    propositionClass: key,
    subprovision: entry.subprovision,
    baseCode: entry.baseCode,
    originatingLaw: entry.originatingLaw,
    originatingEffectivity: entry.originatingEffectivity,
    currentAuthoritySet,
    amendingAuthorities,
    applicableAmendments,
    reviewedAmendments: entry.reviewedAmendments.map((r) => r.id),
    reviewedButNotApplicable,
    notYetEffective,
    resolvedYear,
    chainId: CHAIN_ID,
    officialLaws
  };

  // Later-amendment propositions (51(C)(2)) need a resolvable period.
  if (entry.baseStatus === "LATER_AMENDMENT_REQUIRED") {
    if (resolvedYear == null) {
      return { ...base, chainStatus: "LATER_AMENDMENT_REQUIRED", sufficient: false, reason: "filing_period_not_resolved" };
    }
    if (applicableAmendments.length === 0) {
      // period predates the amending law -> the pre-amendment (base) form applied.
      return { ...base, chainStatus: "HISTORICAL_COMPLETE_CHAIN", currentAuthoritySet: ["NIRC Sec. 51(C)"], sufficient: true, reason: null };
    }
    return { ...base, chainStatus: "LATER_AMENDMENT_REQUIRED", sufficient: true, reason: null };
  }

  // Ordinary propositions: unchanged through the chain. If the resolved period predates
  // any reviewed law, that law is recorded as notYetEffective (already partitioned) but
  // the proposition itself remains supported for that historical period.
  const chainStatus = resolvedYear != null && notYetEffective.length > 0 && resolvedYear < CURRENT_YEAR
    ? "HISTORICAL_COMPLETE_CHAIN"
    : entry.baseStatus;
  return { ...base, chainStatus, sufficient: true, reason: null };
}

/**
 * Sanitized amendment-chain summary to attach to a Section 51 source card so it records
 * that the later chain was reviewed and correctly identifies the originating law.
 */
export function buildSection51AmendmentChainMetadata(ref = "", input = {}) {
  const r = String(ref || "");
  const propositionClass = /51-?a/i.test(r) ? "substituted_filing"
    : /51\(c\)\(2\)/i.test(r) ? "filing_deadline_transaction"
    : /51\(c\)/i.test(r) ? "filing_deadline"
    : "filing_obligation";
  const resolved = resolveSection51AuthorityChain({ propositionClass, subprovision: r, ...input });
  return {
    amendmentChainReviewed: true,
    chainReviewed: true,
    amendmentChainId: resolved.chainId,
    amendmentChainStatus: resolved.chainStatus,
    chainStatus: resolved.chainStatus,
    baseCode: resolved.baseCode,
    originatingLaw: resolved.originatingLaw,
    currentAuthoritySet: resolved.currentAuthoritySet,
    controllingAuthorities: resolved.currentAuthoritySet,
    reviewedAmendments: resolved.reviewedAmendments,
    applicableAmendments: resolved.applicableAmendments,
    reviewedButNotApplicable: resolved.reviewedButNotApplicable,
    notYetEffective: resolved.notYetEffective,
    officialAmendmentLaws: resolved.officialLaws
  };
}

export default {
  SECTION51_OFFICIAL_LAWS,
  SECTION51_AMENDMENT_CHAIN,
  resolveSection51AuthorityChain,
  buildSection51AmendmentChainMetadata
};
