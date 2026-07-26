// PHASE-10A14-R20 COMMIT 5R1-C15 iteration 04 — CLARIFY family split, and the label
// relation as the controlling explanation.
//
// (a) The two CLARIFY families are separated by WHAT is unresolved (§8D):
//       an ambiguous ACRONYM asked about directly -> ambiguous_tax_acronym
//       a topic named with no relation to any target -> no_tax_relation
//     R3: "What is FWT for item 4?" -> ambiguous_tax_acronym
//         "What about gross receipts for scenario 1?" -> no_tax_relation
//     Both stay CLARIFY, so the locked decision lane is untouched.
//
// (b) NAMES_AS_INTERNAL_LABEL, when the naming act IS the request, is the controlling
//     explanation. Iteration 03 wired this into one REFUSE path; a naming ASSERTION
//     that emits no non-tax-action relation reaches a different branch and still fell
//     through to the generic family.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// --- (a) CLARIFY family split ---------------------------------------------------
const anchorA = `  const primaryIsInterrogative = /^(?:what|which|who|whom|whose|when|where|why|how|is|are|was|were|do|does|did|can|could|should|would|may|might|will|shall|has|have|had|ano|alin|sino|paano|kailan|saan|bakit|may|magkano|kailangan)\\b/i.test(primaryTextLo)
    && !interrogativeRequestsAction && !assertionWithQuestionMark;`;
if (!s.includes(anchorA)) throw new Error('ANCHOR_MISS primaryIsInterrogative');
const addA = anchorA + `
  // C15 — WHAT IS UNRESOLVED decides which CLARIFY family explains the decision.
  // A direct question about a short token asks which sense of that TOKEN is meant.
  // A question that raises a spelled-out topic instead names subject matter that is
  // simply unconnected to any target. Both remain CLARIFY.
  const asksAboutShortToken = /\\bwhat is\\s+["']?[a-z]{2,6}["']?\\b/i.test(primaryTextLo)
    && !/\\bwhat is (?:the|a|an|this|that|it)\\b/i.test(primaryTextLo);
  // A raised topic that is MATERIALLY AMBIGUOUS — a term with a live non-tax sense
  // (customs/traditions, estate/property, receipt/proof, invoice, authority to print) —
  // needs the term itself disambiguated. A topic that is unambiguously tax-domain
  // (gross receipts, professional fees, assessment, deduction) is clear in meaning and
  // simply has no relation to any target. Both remain CLARIFY; only the explanation
  // differs.
  const raisedTopic = (primaryTextLo.match(/\\bwhat about\\s+(.+?)(?:\\s+(?:for|in|sa)\\b|[?.!]|$)/i) || [, ''])[1] || '';
  const raisedTopicIsHomograph = /\\b(?:customs|estate|receipt|invoice|authority to print|books|return|prescription|assessment)\\b/i.test(raisedTopic)
    && !/\\b(?:gross|professional|filing|deficiency|withholding|input|output|percentage|documentary|capital)\\b/i.test(raisedTopic);
  const asksAboutAmbiguousTopic = /\\bwhat about\\b/i.test(primaryTextLo) && raisedTopicIsHomograph;
  const raisesTopicWithoutRelation = /\\bwhat about\\b/i.test(primaryTextLo) && !raisedTopicIsHomograph;`;
s = s.replace(anchorA, addA);

const clarifyAnchor = `  const barePolysemousAcronym`;
if (!s.includes(clarifyAnchor)) throw new Error('ANCHOR_MISS barePolysemousAcronym');

// --- (b) the label relation controls an asserted naming act ---------------------
const anchorB = `  if (requestsNonTax && !hasTreatment && !hasCompliance && !evidence.taxRelationOverPrimaryTarget`;
if (!s.includes(anchorB)) throw new Error('ANCHOR_MISS refuse branch');
const addB = `  // C15 reason lane — an ASSERTED naming act is explained by the label relation even
  // when no non-tax-action relation is emitted, so it is tested before the generic
  // non-tax branches.
  if (namesLabel && evidence.namingActControlsRequest && !hasTreatment && !hasCompliance
      && !quotesTerm && !expandsNonTax && !evidence.taxRelationOverPrimaryTarget) {
    return decide('REFUSE', 'non_tax_label_or_name', 0.90);
  }
  if (requestsNonTax && !hasTreatment && !hasCompliance && !evidence.taxRelationOverPrimaryTarget`;
s = s.replace(anchorB, addB);

// --- (a) wire the CLARIFY split at the dangling-referent site -------------------
// This is the FIRST CLARIFY exit and the one the "What about <topic> for scenario N?"
// rows actually take. It selects the family from acronym ambiguity alone, so a
// materially ambiguous TOPIC was not recognised.
const cAnchor = `  if (evidence.danglingScenario) {
    const acrAmbiguous = acr.some((a) => a.ambiguous);
    return decide('CLARIFY', acrAmbiguous ? 'ambiguous_tax_acronym' : 'no_tax_relation', 0.50);
  }`;
if (!s.includes(cAnchor)) throw new Error('ANCHOR_MISS danglingScenario site');
s = s.replace(cAnchor, `  if (evidence.danglingScenario) {
    const acrAmbiguous = acr.some((a) => a.ambiguous);
    // A materially ambiguous TOPIC needs the term itself disambiguated, exactly as an
    // ambiguous acronym does; an unambiguously tax-domain topic simply has no relation.
    const topicAmbiguous = evidence.asksAboutAmbiguousTopic || evidence.asksAboutShortToken;
    return decide('CLARIFY', (acrAmbiguous || topicAmbiguous) ? 'ambiguous_tax_acronym' : 'no_tax_relation', 0.50);
  }`);

const bagAnchor = `taxRelationOverPrimaryTarget, primaryIsInterrogative, proceduralComplianceFrame,`;
if (!s.includes(bagAnchor)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bagAnchor, `taxRelationOverPrimaryTarget, primaryIsInterrogative, asksAboutShortToken, asksAboutAmbiguousTopic, raisesTopicWithoutRelation, proceduralComplianceFrame,`);

// Every CLARIFY exit must choose its family by what is unresolved.
let clarifyRewrites = 0;
s = s.replace(/return decide\('CLARIFY', 'ambiguous_tax_acronym', ([0-9.]+)\)/g, (m, conf) => {
  clarifyRewrites++;
  return `return decide('CLARIFY', evidence.raisesTopicWithoutRelation && !evidence.asksAboutShortToken ? 'no_tax_relation' : 'ambiguous_tax_acronym', ${conf})`;
});
s = s.replace(/return decide\('CLARIFY', 'no_tax_relation', ([0-9.]+)\)/g, (m, conf) => {
  clarifyRewrites++;
  return `return decide('CLARIFY', (evidence.asksAboutShortToken || evidence.asksAboutAmbiguousTopic) ? 'ambiguous_tax_acronym' : 'no_tax_relation', ${conf})`;
});

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-04 applied; clarify sites rewritten =', clarifyRewrites, '; bytes', before.length, '->', s.length);
