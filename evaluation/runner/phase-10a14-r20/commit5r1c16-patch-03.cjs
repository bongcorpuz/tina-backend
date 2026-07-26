// PHASE-10A14-R20 COMMIT 5R1-C16 iteration 03 — §9B action-head precedence, and the
// local-redefinition assertion as a requested operation.
//
// (a) §9B is explicit: "use explicit_non_tax_task when the object merely happens to be
//     a folder, code-named item, or labelled artefact but the requested operation is
//     print, move, delete, format, copy, sort, or another non-naming action. The action
//     head controls." Two label branches still fire ahead of that test, so
//     "rename the SLSP project folder" is explained as a naming act.
//
// (b) A local-redefinition assertion ("Project code lang ang SLSP?", "Radio station
//     lang ang RMC namin?") asserts what something is called. R3 explains these as
//     explicit_non_tax_task: the speaker is performing a naming/redefinition act on the
//     token, which is a non-tax operation, not an absence of relation.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// --- (a) the action head controls over any label reading -----------------------
// Both C15 label branches are guarded by the measured operation test.
const a1 = `  if (namesLabel && evidence.namingActControlsRequest && !hasTreatment && !hasCompliance
      && !quotesTerm && !expandsNonTax && !evidence.taxRelationOverPrimaryTarget) {
    return decide('REFUSE', 'non_tax_label_or_name', 0.90);
  }`;
if (!s.includes(a1)) throw new Error('ANCHOR_MISS label branch 1');
s = s.replace(a1, `  if (namesLabel && evidence.namingActControlsRequest && !evidence.reasonRequestsOperation
      && !hasTreatment && !hasCompliance
      && !quotesTerm && !expandsNonTax && !evidence.taxRelationOverPrimaryTarget) {
    return decide('REFUSE', 'non_tax_label_or_name', 0.90);
  }`);

const a2 = `    if (namesLabel && evidence.namingActControlsRequest) return decide('REFUSE', 'non_tax_label_or_name', 0.90);`;
if (!s.includes(a2)) throw new Error('ANCHOR_MISS label branch 2');
s = s.replace(a2, `    // §9B — the action head controls: an ordinary operation on a labelled artefact is
    // an action, not a naming act.
    if (namesLabel && evidence.namingActControlsRequest && !evidence.reasonRequestsOperation) return decide('REFUSE', 'non_tax_label_or_name', 0.90);`);

// --- (b) a local-redefinition assertion is a requested operation ----------------
const b1 = `  const reasonRequestsOperation = (reasonImperativeHead && reasonHasActionTarget)
    || interrogativeRequestsAction;`;
if (!s.includes(b1)) throw new Error('ANCHOR_MISS reasonRequestsOperation');
s = s.replace(b1, `  // A LOCAL REDEFINITION asserts what a token is called here ("<sense> lang ang <token>",
  // "<token> namin"). That is a naming/redefinition act performed on the token — a
  // non-tax operation — rather than an absence of any tax relation.
  const reasonLocalRedefinitionAct = /\\blang ang\\b|\\blang ba\\b|\\bibig kong sabihin\\b|\\bnamin\\b\\s*\\??$/i.test(primaryTextLo);
  const reasonRequestsOperation = (reasonImperativeHead && reasonHasActionTarget)
    || interrogativeRequestsAction
    || reasonLocalRedefinitionAct;`);

const bag = `reasonRequestsOperation, reasonTargetIsExternalObject,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonRequestsOperation, reasonLocalRedefinitionAct, reasonTargetIsExternalObject,`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-03 applied; bytes', before.length, '->', s.length);
