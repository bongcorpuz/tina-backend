// FILE: services/staging-trust-fixtures.js
// PHASE-10A4C-TRUST-CALIBRATION-CONFLICT-STATE-ACCESSIBILITY-KEYBOARD-AND-DETERMINISTIC-FIXTURE-REMEDIATION-1
//
// Deterministic, staging-only trust-state fixtures for representative
// authenticated-browser validation of the canonical trust matrix (A-G).
//
// Root cause this module addresses (Case F): pipeline.js's real Step 9
// Four-Part Doctrine Test output shape ({ trueConflicts, count, hasConflict })
// never satisfies answer-renderer.js's conflictMetadataIsComplete() gate (see
// services/conflict-trust-classifier.js and the PHASE-10A1-R1 test suite,
// which already documents this as a known, pre-existing limitation, not a
// new regression). This means VERIFIED_CONFLICT is currently unreachable
// from any live natural-language query. Enriching the real doctrine engine
// to always populate the renderer's required fields is a separate, larger,
// higher-risk remediation requiring dedicated conflict-engine review and is
// explicitly OUT OF SCOPE here. This module instead proves the RENDERING
// chain (trust-contract -> persistence -> frontend banner) is correct for a
// genuine conflict, using a hardcoded, fully-complete conflict object.
//
// Security posture:
//   - A FIXED, closed set of named fixture IDs. No free-form injection of
//     trust fields, source content, or arbitrary metadata is accepted from
//     the client -- only a fixtureId string is read, and it must exactly
//     match a key in FIXTURES below.
//   - Fails closed everywhere except a genuine staging backend runtime
//     (isStagingBackendRuntime(), the same server-injected-Render-env gate
//     already proven in security/cors-policy.js's CORS remediation -- never
//     the client Host header, never NODE_ENV alone).
//   - Requires the caller to already be authenticated (wired in after the
//     existing `authenticate` middleware in ask-handler.js's handleAsk, not
//     before it) -- no new authentication bypass.
//   - Never mutates any real data; does not call retrieval, does not call an
//     LLM, does not touch the vector store or any production table beyond
//     the same conversation-message persistence every other /ask response
//     already writes to for the authenticated caller's own conversation.
//   - Contains no secrets, no real taxpayer/client data, no private
//     infrastructure identifiers.

import { isStagingBackendRuntime } from "../security/cors-policy.js";

function sourceCard({ title, normalizedReference, authorityType, publicUrl = null }) {
  return {
    title,
    normalized_reference: normalizedReference,
    authorityType,
    publicUrl
  };
}

// PHASE-10A4C: fixed, closed registry. Each entry produces the exact
// `result`-shaped object services/trust-contract.js's buildResponseTrust()
// consumes, plus the canned answer text and source cards the response
// payload needs. No field is derived from client input beyond the fixtureId
// lookup key itself.
export const STAGING_TRUST_FIXTURES = Object.freeze({
  "A-VERIFIED-CONTROLLING": {
    answer:
      "Short Answer\nRevenue Regulation No. 2-98 governs the general rules on withholding tax in the Philippines, including the obligation of withholding agents to deduct and remit tax on specified income payments.",
    sourceStatus: "AUTHORITY_FOUND",
    displayedSourceCount: 1,
    sourceCards: [sourceCard({ title: "RR No. 2-98", normalizedReference: "RR No. 2-98", authorityType: "REVENUE_REGULATION", publicUrl: "https://www.bir.gov.ph/" })]
  },
  "B-RELATED-AUTHORITY-ONLY": {
    answer:
      "Short Answer\nExpanded Withholding Tax (EWT) generally requires certain payors to withhold a portion of specified income payments and remit it to the BIR. The exact rate and coverage vary by category of income.",
    sourceStatus: "RELATED_AUTHORITY_ONLY",
    displayedSourceCount: 1,
    sourceCards: [sourceCard({ title: "NIRC, general withholding provisions", normalizedReference: "NIRC (general)", authorityType: "STATUTE" })]
  },
  "C-SPECIFIC-AUTHORITY-NOT-FOUND": {
    answer:
      "Short Answer\nThere is no specific BIR issuance that addresses the tax treatment of drone delivery services. The general tax principles under the National Internal Revenue Code (NIRC) would apply, and any specific tax treatment would depend on the nature of the services provided.",
    sourceStatus: "AUTHORITY_FOUND",
    displayedSourceCount: 2,
    sourceCards: [
      sourceCard({ title: "NIRC Sec. 2", normalizedReference: "NIRC Sec. 2", authorityType: "STATUTE" }),
      sourceCard({ title: "NIRC Sec. 3", normalizedReference: "NIRC Sec. 3", authorityType: "STATUTE" })
    ]
  },
  "D-RETRIEVAL-TIMEOUT": {
    answer:
      "TINA could not complete source retrieval in time for this question. This does not mean no law or authority exists -- please retry or narrow the question.",
    sourceStatus: "RETRIEVAL_TIMEOUT",
    displayedSourceCount: 0,
    sourceCards: []
  },
  "E-RESTRICTED-OUTCOME-PREDICTION": {
    answer:
      "A conclusive determination of validity, invalidity, voidness, finality, or appealability cannot be made from the limited information in this question. Official-source verification and human tax/legal review are required before relying on any authority referenced in this guidance. This is procedural guidance only, not a final legal opinion.",
    responseType: "controlled_loa_legal_conclusion_restricted",
    sourceStatus: "NOT_APPLICABLE",
    displayedSourceCount: 0,
    sourceCards: [],
    controlledLoaAnswer: { requiresHumanReview: true, filingReadyDocumentGenerated: false, automaticSubmission: false }
  },
  "F-CONFLICTING-AUTHORITY": {
    answer:
      "Short Answer\nThere is a genuine conflict between two BIR issuances on the timing of input VAT crediting. Revenue Regulation No. 16-2005 and a subsequent Revenue Memorandum Circular take differing positions on when input VAT may be credited, and this conflict has not been resolved by a later controlling issuance.",
    sourceStatus: "AUTHORITY_FOUND",
    displayedSourceCount: 2,
    sourceCards: [
      sourceCard({ title: "RR No. 16-2005", normalizedReference: "RR No. 16-2005", authorityType: "REVENUE_REGULATION" }),
      sourceCard({ title: "RMC on input VAT timing", normalizedReference: "RMC (input VAT timing)", authorityType: "MEMORANDUM_CIRCULAR" })
    ],
    // Fully complete conflict object -- satisfies BOTH classifyConflictState's
    // rendererCandidate gate (conflictAnalysis.hasConflict === true) AND
    // answer-renderer.js's conflictMetadataIsComplete() (conflict === true,
    // conflictType, exactIssue, exactLegalDimension, sameIssueGate.passed,
    // oppositeHoldingGate.passed, resolutionBasis all present).
    conflictAnalysis: {
      hasConflict: true,
      conflict: true,
      conflictType: "DOCTRINAL_CONFLICT",
      exactIssue: "Timing of input VAT crediting",
      exactLegalDimension: "Input VAT crediting period",
      sameIssueGate: { passed: true },
      oppositeHoldingGate: { passed: true },
      resolutionBasis: "No later controlling issuance has resolved the conflict; both remain in force pending clarification.",
      trueConflicts: [{ trueConflict: true }],
      count: 1
    }
  },
  "G-GENERAL-NON-RESTRICTED": {
    answer:
      "Short Answer\nThe standard corporate income tax rate for domestic corporations in the Philippines is 25% on taxable income, as provided in the NIRC.",
    sourceStatus: "AUTHORITY_FOUND",
    displayedSourceCount: 1,
    sourceCards: [sourceCard({ title: "NIRC Sec. 27(A)", normalizedReference: "NIRC Sec. 27(A)", authorityType: "STATUTE" })]
  }
});

/**
 * Resolves a requested staging fixture. Returns null (fail closed) unless
 * the runtime is genuinely staging AND fixtureId exactly matches a fixed
 * registry key. Never trusts client-supplied content beyond the lookup key.
 *
 * @param {unknown} fixtureId
 * @param {object} [env=process.env]
 * @returns {object|null}
 */
export function resolveStagingFixture(fixtureId, env = process.env) {
  if (!isStagingBackendRuntime(env)) return null;
  if (typeof fixtureId !== "string") return null;
  const fixture = STAGING_TRUST_FIXTURES[fixtureId];
  return fixture ? { ...fixture, fixtureId } : null;
}
