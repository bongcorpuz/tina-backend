// FILE: section51-authority-chain.js
// PHASE-10A14-R5: Governed Section 51 / 51-A amendment-chain resolver.
//
// This is a DERIVED GOVERNANCE OBJECT, not an official consolidated statute. It
// links the official amendment identifiers (RA 8424 / 10963 / 11976 / 12214) to
// each Section 51 proposition so the runtime can (a) record that the later
// amendment chain was reviewed, (b) present amendment-chain metadata on source
// cards instead of implying "RA 10963 is the only current authority", and
// (c) drive a narrow temporal-sufficiency gate.
//
// Every entry is grounded in official-source verification recorded in
// evaluation/results/phase-10a14-r5/official-amendment-chain.md (lawphil / Official
// Gazette / BIR). No text is fabricated; only official identifiers + canonical URLs.
//
// SCOPE: Section 51 authority chain only. This is NOT the Phase 12L temporal citator.

"use strict";

// Official amendment records (identifiers + canonical URLs only; not statute text).
export const SECTION51_OFFICIAL_LAWS = Object.freeze({
  "RA 8424": Object.freeze({ title: "NIRC of 1997", approved: "1997-12-11", effectivity: "1998-01-01", url: "https://lawphil.net/statutes/repacts/ra1997/ra_8424_1997.html" }),
  "RA 10963": Object.freeze({ title: "TRAIN Law", approved: "2017-12-19", effectivity: "2018-01-01", url: "https://lawphil.net/statutes/repacts/ra2017/ra_10963_2017.html" }),
  "RA 11976": Object.freeze({ title: "Ease of Paying Taxes (EOPT) Act", approved: "2024-01-05", effectivity: "2024-01-22", url: "https://lawphil.net/statutes/repacts/ra2024/ra_11976_2024.html" }),
  "RA 12214": Object.freeze({ title: "Capital Markets Efficiency Promotion Act (CMEPA)", approved: "2025-05-29", effectivity: "2025-07-01", url: "https://lawphil.net/statutes/repacts/ra2025/ra_12214_2025.html" })
});

// Proposition-level amendment matrix (officially verified — see WS2 record).
export const SECTION51_AMENDMENT_CHAIN = Object.freeze([
  Object.freeze({
    propositionClass: "filing_obligation", subprovision: "51(A)",
    applicableFrom: "1998-01-01", applicableUntil: null,
    baseAuthority: "NIRC Sec. 51",
    amendingAuthorities: Object.freeze(["RA 10963", "RA 11976"]),
    currentAuthoritySet: Object.freeze(["NIRC Sec. 51"]),
    chainStatus: "BASE_PROVISION_UNCHANGED_BUT_CHAIN_REVIEWED",
    note: "EOPT changed manner/venue + OCW exemption only; the obligation rule is intact through RA 12214."
  }),
  Object.freeze({
    propositionClass: "filing_deadline", subprovision: "51(C)(1)",
    applicableFrom: "1998-01-01", applicableUntil: null,
    baseAuthority: "NIRC Sec. 51(C)",
    amendingAuthorities: Object.freeze([]),
    currentAuthoritySet: Object.freeze(["NIRC Sec. 51(C)"]),
    chainStatus: "CURRENT_COMPLETE_CHAIN",
    note: "April 15 annual deadline unchanged by RA 11976 / RA 12214."
  }),
  Object.freeze({
    propositionClass: "filing_deadline_transaction", subprovision: "51(C)(2)",
    applicableFrom: "2025-07-01", applicableUntil: null,
    baseAuthority: "NIRC Sec. 51(C)",
    amendingAuthorities: Object.freeze(["RA 12214"]),
    currentAuthoritySet: Object.freeze(["NIRC Sec. 51(C)", "RA 12214"]),
    chainStatus: "LATER_AMENDMENT_REQUIRED",
    note: "CGT / transaction-specific 30-day return updated by CMEPA (RA 12214); the later law is part of the controlling set."
  }),
  Object.freeze({
    propositionClass: "substituted_filing", subprovision: "51-A",
    applicableFrom: "1998-01-01", applicableUntil: null,
    baseAuthority: "NIRC Sec. 51-A",
    amendingAuthorities: Object.freeze([]),
    currentAuthoritySet: Object.freeze(["NIRC Sec. 51-A"]),
    chainStatus: "CURRENT_COMPLETE_CHAIN",
    note: "Substituted-filing conditions unchanged by RA 11976 / RA 12214."
  })
]);

const CHAIN_ID = "SEC51-CHAIN-2026-07 (RA 8424 -> 10963 -> 11976 -> 12214)";

function normProp(propositionClass = "", subprovision = "") {
  const p = String(propositionClass || "").toLowerCase();
  const s = String(subprovision || "").toLowerCase();
  if (/substitut/.test(p) || /51-?a/.test(s)) return "substituted_filing";
  if (/transaction|capital|cgt|share|real property/.test(p) || /51\(c\)\(2\)/.test(s)) return "filing_deadline_transaction";
  if (/deadline/.test(p) || /51\(c\)/.test(s)) return "filing_deadline";
  return "filing_obligation";
}

/**
 * Resolve the operative Section 51 authority set for a proposition + period.
 * Pure. taxableYear/filingEventDate optional; when a period is material to a
 * later-amendment proposition and is missing, returns TEMPORAL_FACT_MISSING.
 *
 * @returns {{
 *   chainStatus: string, propositionClass: string, subprovision: string,
 *   currentAuthoritySet: string[], amendingAuthorities: string[],
 *   sufficient: boolean, reason: (string|null), chainId: string,
 *   officialLaws: object[]
 * }}
 */
export function resolveSection51AuthorityChain({
  propositionClass = "filing_obligation",
  subprovision = "",
  taxableYear = null
} = {}) {
  const key = normProp(propositionClass, subprovision);
  const entry = SECTION51_AMENDMENT_CHAIN.find((e) => e.propositionClass === key)
    || SECTION51_AMENDMENT_CHAIN[0];

  const officialLaws = [entry.baseAuthority.includes("51") ? "RA 8424" : null, ...entry.amendingAuthorities]
    .filter(Boolean)
    .map((id) => ({ id, ...(SECTION51_OFFICIAL_LAWS[id] || {}) }));

  const base = {
    chainStatus: entry.chainStatus,
    propositionClass: key,
    subprovision: entry.subprovision,
    currentAuthoritySet: [...entry.currentAuthoritySet],
    amendingAuthorities: [...entry.amendingAuthorities],
    chainId: CHAIN_ID,
    officialLaws
  };

  // Later-amendment propositions need a resolvable period to decide historical vs current.
  if (entry.chainStatus === "LATER_AMENDMENT_REQUIRED") {
    if (taxableYear == null) {
      return { ...base, sufficient: false, reason: "filing_period_not_resolved" };
    }
    const yr = Number(taxableYear);
    // Before the amending law's effectivity year the base (pre-amendment) form applied.
    if (yr < 2025) {
      return {
        ...base,
        chainStatus: "HISTORICAL_COMPLETE_CHAIN",
        currentAuthoritySet: ["NIRC Sec. 51(C)"],
        amendingAuthorities: [],
        sufficient: true,
        reason: null
      };
    }
    // Current period: the later law is part of the controlling set and must be represented.
    return { ...base, sufficient: true, reason: null };
  }

  // Unchanged / current-chain propositions are sufficient once the chain is reviewed.
  return { ...base, sufficient: true, reason: null };
}

/**
 * Amendment-chain metadata to attach to a Section 51 source card / bridge row so
 * it no longer implies "RA 10963 is the only current authority".
 * @param {string} ref normalized_reference (e.g. "NIRC Sec. 51", "NIRC Sec. 51(C)", "NIRC Sec. 51-A")
 */
export function buildSection51AmendmentChainMetadata(ref = "") {
  const r = String(ref || "");
  const propositionClass = /51-?a/i.test(r) ? "substituted_filing"
    : /51\(c\)/i.test(r) ? "filing_deadline"
    : "filing_obligation";
  const resolved = resolveSection51AuthorityChain({ propositionClass, subprovision: r });
  return {
    amendmentChainReviewed: true,
    amendmentChainId: resolved.chainId,
    amendmentChainStatus: resolved.chainStatus,
    currentAuthoritySet: resolved.currentAuthoritySet,
    amendingAuthorities: resolved.amendingAuthorities,
    officialAmendmentLaws: resolved.officialLaws
  };
}

export default {
  SECTION51_OFFICIAL_LAWS,
  SECTION51_AMENDMENT_CHAIN,
  resolveSection51AuthorityChain,
  buildSection51AmendmentChainMetadata
};
