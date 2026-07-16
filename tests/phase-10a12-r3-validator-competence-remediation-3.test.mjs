// PHASE-10A12-R3-VALIDATOR-COMPETENCE-REMEDIATION-3
//
// Remediates the confirmed A12-R2 P1-1 defect: Q5-p1 received
// VERIFIED_CONTROLLING for an answer that granted an incentive treatment
// (zero-rating) for goods used to make export products citing ONLY generic VAT
// authority (NIRC Sec 107, RR No. 16-2005), without establishing the
// CREATE MORE / RA No. 12066 exemption basis. The new Q5 source-sufficiency gate
// (evaluateImportVatIncentiveSourceSufficiency) fails closed when an incentive
// treatment is claimed on generic authority alone, while preserving valid,
// authority-supported Q5 verified reachability (no blanket downgrade).
//
// Covers STEP 6 test matrix cases 1-15. Deterministic (no network) -- the LLM
// stage is never reached for invalid cases because the deterministic gate fires
// first; valid cases stop at "unavailable" here (no client injected) which is
// the correct fail-closed-but-not-blocked signal (the gate did NOT fire).

import assert from "node:assert/strict";
import {
  evaluateImportVatIncentiveSourceSufficiency,
  evaluateAnswerSupport
} from "../services/answer-support-validator.js";

let passed = 0, failed = 0, assertions = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}
function check(c, m) { assertions++; assert(c, m); }

const S107 = [{ label: "NIRC Sec. 107" }, { label: "RR No. 16-2005" }];
const RA12066 = [{ label: "RA No. 12066 (CREATE MORE)" }, { label: "NIRC Sec. 295" }];

// The exact committed A12-R2 Q5-p1 answer (invalid VERIFIED_CONTROLLING).
const Q5P1_ANSWER = `### Short Answer
Import VAT on goods is generally levied at a rate of 12% as per the National Internal Revenue Code (NIRC). However, goods used to produce export products may qualify for zero-rating under specific conditions.

### Controlling Authorities
The applicable provision is Section 107 of the NIRC, which states that a value-added tax equivalent to twelve percent (12%) is imposed on every importation of goods. Revenue Regulations No. 16-2005 further clarifies the application of VAT on imported goods.

### Practical Meaning
For businesses importing goods intended for export, it is crucial to determine whether the goods can be classified as zero-rated. If they qualify, the business can avoid paying the 12% VAT on importation and instead claim input tax credits on related purchases.`;
const Q5_QUESTION = "Is import VAT always 12% for goods used to make export products?";

// helper: gate fired (invalid) means evaluateAnswerSupport stops at the
// incentive-source-sufficiency stage with verifiedEligible=false.
async function stage(question, answer, sources) {
  const r = await evaluateAnswerSupport({ question, answer, sources });
  return r;
}

// 1. Q5-p1 exact invalid answer -> gate fires, not verified.
await test("R3-1: Q5-p1 exact invalid answer does not verify", async () => {
  const g = evaluateImportVatIncentiveSourceSufficiency({ question: Q5_QUESTION, answer: Q5P1_ANSWER, sources: S107 });
  check(g.applicable === true, "applicable");
  check(g.sufficient === false, "insufficient");
  check(g.diagnostics.genericAuthorityOnly === true, "genericAuthorityOnly");
  const r = await stage(Q5_QUESTION, Q5P1_ANSWER, S107);
  check(r.verifiedEligible === false, "not verified");
  check(r.stage === "incentive-source-sufficiency", "gate stage");
});

// 2. Same answer, different word order.
await test("R3-2: reordered invalid answer does not verify", async () => {
  const reordered = `### Short Answer
Goods used to produce export products may qualify for zero-rating under specific conditions, although import VAT is generally 12% under the NIRC. Section 107 imposes 12% on importation; RR No. 16-2005 clarifies its application.`;
  const r = await stage(Q5_QUESTION, reordered, S107);
  check(r.verifiedEligible === false, "not verified");
  check(r.stage === "incentive-source-sufficiency", "gate stage");
});

// 3. "Zero-rated" used where only exemption is supported (generic authority).
await test("R3-3: zero-rating claim on generic authority does not verify", async () => {
  const a = `### Short Answer\nImportation of goods for export is zero-rated. The applicable provision is Section 107 of the NIRC and RR No. 16-2005, which govern value-added tax on importation of goods generally.`;
  const g = evaluateImportVatIncentiveSourceSufficiency({ question: Q5_QUESTION, answer: a, sources: S107 });
  check(g.diagnostics.zeroRatingBasisSupported === false, "zero-rating not supported");
  const r = await stage(Q5_QUESTION, a, S107);
  check(r.verifiedEligible === false, "not verified");
});

// 4. "Exempt" used where only zero-rating is supported (generic authority).
await test("R3-4: exemption claim on generic authority does not verify", async () => {
  const a = `### Short Answer\nImported goods used to make export products are VAT-exempt. This follows from Section 107 of the NIRC and RR No. 16-2005 on the value-added tax on importation of goods.`;
  const g = evaluateImportVatIncentiveSourceSufficiency({ question: Q5_QUESTION, answer: a, sources: S107 });
  check(g.diagnostics.exemptionBasisSupported === false, "exemption not supported");
  const r = await stage(Q5_QUESTION, a, S107);
  check(r.verifiedEligible === false, "not verified");
});

// 5. Generic Section 107 citation with no RA 12066 basis but incentive claimed.
await test("R3-5: generic Sec 107 only with incentive claim does not verify", async () => {
  const a = `### Short Answer\nGoods imported to manufacture export products can be zero-rated for VAT under Section 107 of the NIRC. RR No. 16-2005 implements the value-added tax rules on importation.`;
  const r = await stage(Q5_QUESTION, a, S107);
  check(r.verifiedEligible === false, "not verified");
  check(r.gates.specificIncentiveAuthorityPresent === false, "no specific authority");
});

// 6. RA 12066 cited but qualifying condition omitted (definitive grant) -> fail closed.
await test("R3-6: RA 12066 cited but condition omitted does not verify", async () => {
  const a = `### Short Answer\nImportation of goods for export production is VAT-exempt under RA No. 12066 (CREATE MORE) and NIRC Section 295. The exemption applies to the importation.`;
  const g = evaluateImportVatIncentiveSourceSufficiency({ question: Q5_QUESTION, answer: a, sources: RA12066 });
  check(g.diagnostics.specificIncentiveAuthorityPresent === true, "specific authority present");
  check(g.sufficient === false, "insufficient (no condition)");
  const r = await stage(Q5_QUESTION, a, RA12066);
  check(r.verifiedEligible === false, "not verified");
});

// 7. Correct qualified CREATE MORE treatment (authority + condition) -> gate does NOT fire.
await test("R3-7: qualified CREATE MORE treatment passes the gate (reaches LLM stage)", async () => {
  const a = `### Short Answer\nA registered business enterprise's importation of capital equipment directly attributable to its registered export activity is VAT-exempt under RA No. 12066 (CREATE MORE), subject to the qualifying conditions and effectivity in 2025. NIRC Section 295 provides the exemption for registered export enterprises that qualify.`;
  const g = evaluateImportVatIncentiveSourceSufficiency({ question: Q5_QUESTION, answer: a, sources: RA12066 });
  check(g.sufficient === true, "gate does not fire");
  check(g.diagnostics.incentiveConditionSupported === true, "condition supported");
  const r = await stage(Q5_QUESTION, a, RA12066);
  // No client injected -> "unavailable"; crucially NOT blocked by the incentive gate.
  check(r.stage !== "incentive-source-sufficiency", "not blocked by gate");
});

// 8. Correct denial where taxpayer does not qualify (authority + condition) -> gate does not fire.
await test("R3-8: qualified denial (non-registered taxpayer) passes the gate", async () => {
  const a = `### Short Answer\nAn ordinary importer that is NOT a registered export enterprise cannot claim the CREATE MORE exemption; its importation is subject to 12% VAT. The exemption under RA No. 12066 requires registered-enterprise qualification, which is not met here.`;
  const g = evaluateImportVatIncentiveSourceSufficiency({ question: Q5_QUESTION, answer: a, sources: RA12066 });
  check(g.sufficient === true, "gate does not fire");
});

// 9. Wrong effective period (period not supported) -> diagnostic false; still gated if generic.
await test("R3-9: incentive claim with generic authority and wrong period does not verify", async () => {
  const a = `### Short Answer\nSince 2010, all imports for export are zero-rated per Section 107 of the NIRC and RR No. 16-2005.`;
  const g = evaluateImportVatIncentiveSourceSufficiency({ question: Q5_QUESTION, answer: a, sources: S107 });
  check(g.diagnostics.periodApplicabilitySupported === false, "period not supported");
  const r = await stage(Q5_QUESTION, a, S107);
  check(r.verifiedEligible === false, "not verified");
});

// 10. Mixed old/new incentive law without condition -> definitive grant, no condition => fail closed.
await test("R3-10: mixed incentive law definitive grant without condition does not verify", async () => {
  const a = `### Short Answer\nUnder the old CREATE act and RA No. 12066, importation for export is VAT-exempt. The importation is exempt.`;
  const r = await stage(Q5_QUESTION, a, [{ label: "RA No. 11534 (CREATE)" }, { label: "RA No. 12066" }]);
  check(r.verifiedEligible === false, "not verified (no qualifying condition)");
});

// 11. Real authority but non-supportive provision (generic VAT) with incentive claim.
await test("R3-11: real but non-supportive generic provision does not verify", async () => {
  const a = `### Short Answer\nImported goods for export may qualify for zero-rating. See NIRC Section 106 and Section 108 on value-added tax.`;
  const r = await stage(Q5_QUESTION, a, [{ label: "NIRC Sec. 106" }, { label: "NIRC Sec. 108" }]);
  check(r.verifiedEligible === false, "not verified");
});

// 12. Unsupported universal 12% import VAT (existing omission guard).
await test("R3-12: universal 12% omitting exemption does not verify", async () => {
  const a = `### Short Answer\nImport VAT applies uniformly at 12% to all goods, regardless of whether they are used to make export products. Section 107 of the NIRC imposes 12% on every importation.`;
  const r = await stage("Is import VAT 12% for goods used to make export products?", a, S107);
  check(r.verifiedEligible === false, "not verified");
  check(r.stage === "material-exception-omission" || r.stage === "incentive-source-sufficiency", "caught by a deterministic guard");
});

// 13. Unsupported universal exemption (generic authority).
await test("R3-13: universal exemption on generic authority does not verify", async () => {
  const a = `### Short Answer\nAll importations for export are automatically VAT-exempt under Section 107 of the NIRC and RR No. 16-2005.`;
  const r = await stage(Q5_QUESTION, a, S107);
  check(r.verifiedEligible === false, "not verified");
});

// 14. Correct official-source answer reaching verified eligibility (gate + structural pass).
//     With authority + condition + period, the gate passes; without an injected
//     client the pipeline reports "unavailable" (fail-closed) but NOT gate-blocked.
await test("R3-14: correct official-source qualified answer is not blocked by any deterministic gate", async () => {
  const a = `### Short Answer\nYes for qualified enterprises: a registered export enterprise's importation of goods directly attributable to its registered project is VAT-exempt on importation under RA No. 12066 (CREATE MORE) and NIRC Section 295, effective upon the law's 2025 effectivity and subject to the enterprise meeting its registration and directly-attributable conditions.`;
  const r = await stage("How is import VAT treated for a registered export enterprise's imports used in its registered export activity?", a, RA12066);
  check(r.stage !== "incentive-source-sufficiency", "not blocked by incentive gate");
  check(r.stage !== "material-exception-omission", "not blocked by omission guard");
  check(r.stage !== "treatment-contradiction", "not blocked by contradiction guard");
});

// 15. Missing source excerpt / no operative support: no incentive authority anywhere -> fail closed.
await test("R3-15: no specific authority anywhere fails closed", async () => {
  const a = `### Short Answer\nGoods used to make export products may qualify for zero-rating under the tax rules on importation.`;
  const r = await stage(Q5_QUESTION, a, []);
  check(r.verifiedEligible === false, "not verified");
});

// 17. Qualified-incentive QUESTION answered with a generic input-tax-credit
//     treatment on generic source cards only -> fail closed (the Q5-par10 defect).
await test("R3-17: qualified-incentive question on generic authority does not verify", async () => {
  const a = `### Short Answer\nFor a qualified registered export enterprise, import VAT on directly attributable imports is treated as input tax creditable against output VAT, under Section 107 of the NIRC and RR No. 16-2005.`;
  const q = "How is import VAT treated for a qualified registered export enterprise's directly attributable imports under CREATE MORE?";
  const g = evaluateImportVatIncentiveSourceSufficiency({ question: q, answer: a, sources: S107 });
  check(g.diagnostics.qualifyingIncentiveQuestion === true, "qualifying incentive question");
  check(g.sufficient === false, "insufficient");
  const r = await stage(q, a, S107);
  check(r.verifiedEligible === false, "not verified");
  check(r.stage === "incentive-source-sufficiency", "gate stage");
});

// 18. Prose citation laundering: answer name-drops CREATE MORE but source cards
//     are generic only -> not counted as specific authority -> fail closed.
await test("R3-18: prose CREATE MORE mention with generic source cards does not verify", async () => {
  const a = `### Short Answer\nUnder CREATE MORE, a registered export enterprise's imports may qualify for zero-rating. Section 107 of the NIRC and RR No. 16-2005 apply to importation.`;
  const g = evaluateImportVatIncentiveSourceSufficiency({ question: Q5_QUESTION, answer: a, sources: S107 });
  check(g.diagnostics.specificIncentiveAuthorityInSources === false, "no specific authority in source cards");
  check(g.sufficient === false, "insufficient");
});

// 19. Non-qualifying framing ("does not meet the CREATE MORE conditions") with a
//     correct general-rule answer on generic authority -> NOT blocked (valid).
await test("R3-19: non-qualifying framing general-rule answer is not blocked", async () => {
  const a = `### Short Answer\nImportation is generally subject to 12% VAT under Section 107 of the NIRC, regardless of whether the importer meets the CREATE MORE conditions. RR No. 16-2005 confirms the importer is liable.`;
  const q = "If an importer does not meet the CREATE MORE conditions, is the importation still exempt from VAT?";
  const g = evaluateImportVatIncentiveSourceSufficiency({ question: q, answer: a, sources: S107 });
  check(g.diagnostics.qualifyingIncentiveQuestion === false, "not a qualifying incentive question");
  check(g.sufficient === true, "not blocked (valid general-rule denial)");
});

// Non-regression: an unrelated (non-import, non-incentive) question is untouched by the gate.
await test("R3-16: non-import question is not applicable (no false refusal from this gate)", async () => {
  const g = evaluateImportVatIncentiveSourceSufficiency({
    question: "What is the estate tax rate under TRAIN?",
    answer: "The estate tax rate under TRAIN is a flat 6% of the net estate.",
    sources: [{ label: "NIRC Sec. 84" }]
  });
  check(g.applicable === false, "gate not applicable");
  check(g.sufficient === true, "not blocked");
});

// 20. Outcome-prediction guard gap closed (RES-2): a guarantee/predict trigger
//     followed by a bare "cancel" and "the BIR will cancel" ordering now fire;
//     legitimate tax questions still do not.
await test("R3-20: outcome-prediction guard catches guarantee/bare-cancel forms, no false positive", async () => {
  const mod = await import("../services/answer-support-validator.js");
  const d = mod.detectOutcomePredictionRequest;
  check(d("Guarantee me that the BIR will cancel my assessment if I file a protest.") === true, "guarantee+bare cancel");
  check(d("Will the BIR cancel my assessment?") === true, "will the bir cancel");
  check(d("What are the chances my client will prevail before the CTA?") === true, "chances prevail");
  check(d("What is the estate tax rate under TRAIN?") === false, "no false positive (rate)");
  check(d("How do I file a protest under Section 228?") === false, "no false positive (procedure)");
});

console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
