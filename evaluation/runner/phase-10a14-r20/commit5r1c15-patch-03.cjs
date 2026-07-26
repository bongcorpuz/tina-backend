// PHASE-10A14-R20 COMMIT 5R1-C15 iteration 03 — reason specificity follows the
// controlling relation (§8B, §8C).
//
// Three families are decided by a relation that is ALREADY emitted correctly (the
// relation lane is locked at 3,720/3,720) but is not consulted when the reason is
// selected. Reason must follow the controlling relation, so each is read directly:
//
// (a) ASKS_TAX_COMPLIANCE_FOR, or a procedural filing/remittance/registration frame,
//     is a compliance task even when a specific treatment relation co-occurs. A
//     deadline for REMITTING withholding tax asks a compliance question, not the
//     withholding treatment of the payment.
// (b) ASKS_DEFINITION_OF under controlling tax context is a tax definition, not a
//     residual tax task.
// (c) NAMES_AS_INTERNAL_LABEL is a naming act, so the label family controls over the
//     generic non-tax-action family.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// --- (a) compliance frame controls over a co-occurring treatment relation -------
const anchorA = `  const specificTreatment = ['ASKS_VAT_TREATMENT_OF', 'ASKS_DEDUCTIBILITY_OF', 'ASKS_WITHHOLDING_ON', 'ASKS_CUSTOMS_DUTY_ON'].some(has);
  if (hasTreatment) {`;
if (!s.includes(anchorA)) throw new Error('ANCHOR_MISS specificTreatment');
const addA = `  const specificTreatment = ['ASKS_VAT_TREATMENT_OF', 'ASKS_DEDUCTIBILITY_OF', 'ASKS_WITHHOLDING_ON', 'ASKS_CUSTOMS_DUTY_ON'].some(has);
  // C15 reason lane — a PROCEDURAL frame is a compliance task even when a specific
  // treatment relation co-occurs. "What is the deadline for remitting withholding tax
  // on X" asks WHEN to comply, not how X is treated. The procedural noun must govern
  // the request itself, not merely appear in the text.
  if (evidence.proceduralComplianceFrame && !namesLabel && !quotesTerm && !expandsNonTax) {
    return decide('ALLOW', 'tax_compliance_task', 0.88);
  }
  if (hasTreatment) {`;
s = s.replace(anchorA, addA);

// --- (b) definition relation under tax context controls -------------------------
const anchorB = `  if (asksDefinition && evidence.acronymResolvedByTaxContext && !namesLabel && !expandsNonTax && !quotesTerm) {
    return decide('ALLOW', 'tax_definition_with_context', 0.80);
  }`;
if (!s.includes(anchorB)) throw new Error('ANCHOR_MISS definition branch');
const addB = `  if (asksDefinition && evidence.acronymResolvedByTaxContext && !namesLabel && !expandsNonTax && !quotesTerm) {
    return decide('ALLOW', 'tax_definition_with_context', 0.80);
  }
  // C15 reason lane — an emitted ASKS_DEFINITION_OF relation under controlling tax
  // context IS a tax definition. The relation is already correct; the reason must
  // follow it rather than fall through to the residual tax-task family.
  if (asksDefinition && !namesLabel && !expandsNonTax && !quotesTerm && !requestsNonTax
      && evidence.definitionInControllingTaxContext) {
    return decide('ALLOW', 'tax_definition_with_context', 0.80);
  }`;
s = s.replace(anchorB, addB);

// --- (c) the label relation controls over the generic non-tax-action family -----
const anchorC = `    if (evidence.primaryIsInterrogative) return decide('REFUSE', 'no_tax_relation', 0.88);
    return decide('REFUSE', 'explicit_non_tax_task', 0.90);`;
if (!s.includes(anchorC)) throw new Error('ANCHOR_MISS refuse split');
const addC = `    // A naming act is explained by the label relation, not by the generic non-tax
    // action family, whenever the request itself assigns or reports a name.
    if (namesLabel && evidence.namingActControlsRequest) return decide('REFUSE', 'non_tax_label_or_name', 0.90);
    if (evidence.primaryIsInterrogative) return decide('REFUSE', 'no_tax_relation', 0.88);
    return decide('REFUSE', 'explicit_non_tax_task', 0.90);`;
s = s.replace(anchorC, addC);

// --- evidence -------------------------------------------------------------------
const evAnchor = `  const primaryIsInterrogative = /^(?:what|which|who|whom|whose|when|where|why|how|is|are|was|were|do|does|did|can|could|should|would|may|might|will|shall|has|have|had|ano|alin|sino|paano|kailan|saan|bakit|may|magkano|kailangan)\\b/i.test(primaryTextLo)
    && !interrogativeRequestsAction && !assertionWithQuestionMark;`;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS primaryIsInterrogative');
const evNew = evAnchor + `
  // C15 — a PROCEDURAL COMPLIANCE FRAME: the request asks which form, when to file or
  // remit, what records substantiate, or what penalty applies for late compliance.
  // The procedural noun must govern the request, so it is tested on the primary clause.
  // Narrowed after measurement: R3 treats "what records support X" as TREATMENT, not
  // compliance, so substantiation wording is deliberately excluded. Only an explicit
  // filing/remittance act qualifies.
  const proceduralComplianceFrame = /\\b(?:deadline|due date)\\b[^?.!]*\\b(?:for|sa)\\b[^?.!]*\\b(?:filing|file|remit\\w*|payment|registration|return)\\b/i.test(primaryTextLo)
    || /\\bdeadline for remitting\\b/i.test(primaryTextLo)
    || /\\bpag-?file\\b/i.test(primaryTextLo);
  // C15 — a DEFINITION asked inside controlling tax context. The tax context must be a
  // named authority, instrument or the tax domain itself, not a bare tax-shaped token.
  // Narrowed after measurement: R3 treats a bare "What is <ACRONYM>?" — even inside a
  // BIR frame — as the residual explicit tax task. A definition-with-context requires an
  // explicit definitional verb.
  const definitionInControllingTaxContext = /\\b(?:bir|bureau of internal revenue|national internal revenue code|nirc|tax code|philippine tax|revenue regulation\\w*|revenue memorandum\\w*|assessment|deficiency notice|issuances?|tax rules?|taxation)\\b/i.test(fullLo)
    && /\\b(?:mean|means|meaning|refer to|refers to|stand for|stands for|define|defined|definition)\\b/i.test(fullLo);
  // C15 — a NAMING ACT controls the request: the query assigns, reports or asks about a
  // name/label/code for something, rather than requesting an unrelated action on it.
  // Narrowed after measurement: an imperative action on an object is a non-tax ACTION
  // even when the object carries a code-like name ("rename the SLSP project folder").
  // The naming act must BE the request — an assertion or question about what something
  // is called — not an unrelated action on a named object.
  const namingActControlsRequest = /\\b(?:is (?:only |just )?(?:an?|our) (?:internal )?(?:label|name|code|codename|project code)|code-?named|is called|only our .{0,30}code|project code lang|lang ang)\\b/i.test(fullLo)
    && !(primary && NON_TAX_VERBS.includes(primary.taskVerb));`;
s = s.replace(evAnchor, evNew);

const bagAnchor = `taxRelationOverPrimaryTarget, primaryIsInterrogative, subordinateCodeClause,`;
if (!s.includes(bagAnchor)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bagAnchor, `taxRelationOverPrimaryTarget, primaryIsInterrogative, proceduralComplianceFrame, definitionInControllingTaxContext, namingActControlsRequest, subordinateCodeClause,`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-03 applied; bytes', before.length, '->', s.length);
