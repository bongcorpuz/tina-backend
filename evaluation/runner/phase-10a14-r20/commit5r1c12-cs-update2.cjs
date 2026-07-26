// PHASE-10A14-R20 COMMIT 5R1-C12 — remaining CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  ['Verification gates run against the best candidate:\n\n```text\ndecision-focused regression   PASS (every bucket, not only the closed controls)\ndecision anti-overfit         PASS (21 / 21 checks, executable code with comments stripped)\ndecision determinism          PASS (150 queries x 100 reps; drift 0, byte drift 0, mutation 0)\nclean lock verification       R3 3,720/3,720 reproduced; identity stable; 7 of 8 lock\n                              conditions met, counterfactual condition unmet\nrich-context guard            PASS on all seven shapes\n```',
    'Verification gates run against the locked candidate:\n\n```text\ndecision-focused regression   PASS (every bucket)\nanti-memorization             PASS (no complete counterfactual or R3 query, no query hash,\n                              no oracle id, no suite/family/cluster feature, no scenario\n                              number, no expected-decision map)\ndecision determinism          PASS (150 queries x 100 reps; drift 0, byte drift 0)\nrich-context guard            PASS on all seven shapes\nclean lock verification       PASS - all eleven lock conditions met, identity unchanged\n```'],
  ['5. A tax-canonical acronym is self-resolving only when no metadata-only referent frames\n   it; a for-item suffix supplies no subject and stays materially ambiguous.',
    '5. A tax-canonical acronym is self-resolving only when no metadata-only referent frames\n   it; a for-item suffix supplies no subject and stays materially ambiguous.\n8. A governed tax predicate stops the label and contentless guards from displacing a real\n   tax question, but the styling/program-artefact guard yields only when the artefact is\n   the OBJECT of a commercial tax transaction: a tax-shaped word that names or defines an\n   artefact is a homograph.\n9. The homograph veto is defeated only by a subordinate code or tag clause under a\n   governed tax predicate, never by the mere presence of a tax predicate.\n10. Operator precedence matters in guard expressions: a negation followed by an\n    unparenthesised alternation guards only the first alternative. The label-binding\n    alternation had this defect and was the last counterfactual failure.'],
  ['decision lock:   not achieved - R3 ceiling held at 3,720/3,720 but the\n                 counterfactual condition is unmet (739 / 756)',
    'decision lock:   ACHIEVED - R3 3,720/3,720 and counterfactual 756/756,\n                 independently verified'],
  ['attempt: R20-domain_campaign-r20_commit5r1c11_counterfactual_iteration_07-commit5r1c11-dev-07',
    'attempt: R20-domain_campaign-r20_commit5r1c12_counterfactual_iteration_05-commit5r1c12-dev-05'],
  ['patch:    evaluation/results/phase-10a14-r20/COMMIT_5R1C11_BEST_CANDIDATE.patch',
    'patch:    evaluation/results/phase-10a14-r20/COMMIT_5R1C12_LOCKED_CANDIDATE.patch'],
  ['verification attempt: R20-domain_campaign-r20_commit5r1c11_decision_layer_lock_verification-commit5r1c11-lock',
    'verification attempt: R20-domain_campaign-r20_commit5r1c12_decision_layer_lock_verification-commit5r1c12-lock'],
  ['cumulativeThrough:\ncommit5r1c11-incomplete', 'cumulativeThrough:\ncommit5r1c12'],
  ['decisionLayerClosure:\nfalse', 'decisionLayerClosure:\ntrue'],
  ['total attempts:\n116', 'total attempts:\n122'],
  ['by category:\ndomain_campaign 54 | focused_suite 11 | other 9 | synthetic_validator 42',
    'by category:\ndomain_campaign 60 | focused_suite 11 | other 9 | synthetic_validator 42'],
  ['controlling / non-controlling:\n114 / 2', 'controlling / non-controlling:\n120 / 2'],
  ['PHASE-10A14-R20 — COMMIT 5R1-C12\nDECISION-LAYER COUNTERFACTUAL CLOSURE CONTINUATION 12 AGAINST R3\n```\n\nPreflight',
    'PHASE-10A14-R20 — COMMIT 5R1-C13\nRELATION-LAYER CLOSURE AGAINST R3\n```\n\nPreflight'],
  ['parent chain:             use the pushed C11 commit as the new starting HEAD',
    'parent chain:             use the pushed C12 commit as the new starting HEAD'],
  ['COMMIT 5R1-C12 must:', 'COMMIT 5R1-C13 must:'],
  ['COMMIT 5R1-C12 decision-layer counterfactual closure (continuation)',
    'COMMIT 5R1-C13 relation-layer closure'],
  ['2. reconstruct the best accepted C11 candidate (R3 decision 3,720 / 3,720; counterfactual 739 / 756) from its preserved attempt snapshot;',
    '2. reconstruct the LOCKED C12 candidate (R3 decision 3,720 / 3,720; counterfactual 756 / 756) from its preserved attempt snapshot and verify the recorded services tree digest;'],
  ['5. hold R3 at an exact 3,720 / 3,720 with all closed controls and the seven-shape rich-context guard preserved, and close the remaining 17 failing counterfactual queries through generic structural rules, without reopening any R3 row or guard shape;',
    '5. hold the decision lock intact — R3 3,720 / 3,720, counterfactual 756 / 756, closed controls, rich-context guard and anti-memorization — while remediating the relation lane only; any decision regression rejects the candidate immediately;'],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 58).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
