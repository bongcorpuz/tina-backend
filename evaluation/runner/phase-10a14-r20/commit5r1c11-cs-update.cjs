// PHASE-10A14-R20 COMMIT 5R1-C11 — CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  ['5. A tax-canonical acronym is self-resolving only when no metadata-only referent frames\n   it; a for-item suffix supplies no subject and stays materially ambiguous.',
    '5. A tax-canonical acronym is self-resolving only when no metadata-only referent frames\n   it; a for-item suffix supplies no subject and stays materially ambiguous.\n6. A metadata-suffixed query is contentless when the clause left after stripping the\n   suffix has no subject of its own. Naming a tax does not supply a subject, so the\n   discriminator is a non-deictic subject, not the presence of a tax term.\n7. A governed tax predicate over a definite noun-phrase subject, a prepositional target,\n   a nominalised transaction or an antecedent-resolved deictic all name real targets.'],
  ['decision lock:   not achieved - R3 ceiling reached but the counterfactual\n                 condition is unmet (698 / 756)',
    'decision lock:   not achieved - R3 ceiling held at 3,720/3,720 but the\n                 counterfactual condition is unmet (739 / 756)'],
  ['attempt: R20-domain_campaign-r20_commit5r1c10_development_iteration_06-commit5r1c10-dev-06',
    'attempt: R20-domain_campaign-r20_commit5r1c11_counterfactual_iteration_07-commit5r1c11-dev-07'],
  ['patch:    evaluation/results/phase-10a14-r20/COMMIT_5R1C10_BEST_CANDIDATE.patch',
    'patch:    evaluation/results/phase-10a14-r20/COMMIT_5R1C11_BEST_CANDIDATE.patch'],
  ['verification attempt: R20-domain_campaign-r20_commit5r1c10_decision_layer_lock_verification-commit5r1c10-lock',
    'verification attempt: R20-domain_campaign-r20_commit5r1c11_decision_layer_lock_verification-commit5r1c11-lock'],
  ['cumulativeThrough:\ncommit5r1c10-incomplete', 'cumulativeThrough:\ncommit5r1c11-incomplete'],
  ['total attempts:\n98', 'total attempts:\n116'],
  ['by category:\ndomain_campaign 45 | focused_suite 8 | other 9 | synthetic_validator 36',
    'by category:\ndomain_campaign 54 | focused_suite 11 | other 9 | synthetic_validator 42'],
  ['controlling / non-controlling:\n96 / 2', 'controlling / non-controlling:\n114 / 2'],
  ['PHASE-10A14-R20 — COMMIT 5R1-C11\nDECISION-LAYER CLOSURE CONTINUATION 11 AGAINST R3\n```\n',
    'PHASE-10A14-R20 — COMMIT 5R1-C12\nDECISION-LAYER COUNTERFACTUAL CLOSURE CONTINUATION 12 AGAINST R3\n```\n'],
  ['parent chain:             use the pushed C10 commit as the new starting HEAD',
    'parent chain:             use the pushed C11 commit as the new starting HEAD'],
  ['COMMIT 5R1-C11 must:', 'COMMIT 5R1-C12 must:'],
  ['COMMIT 5R1-C11 decision-layer closure (continuation)', 'COMMIT 5R1-C12 decision-layer counterfactual closure (continuation)'],
  ['2. reconstruct the best accepted C10 decision candidate (decision 3,720 / 3,720; overall 3,097 / 3,720) from its preserved attempt snapshot;',
    '2. reconstruct the best accepted C11 candidate (R3 decision 3,720 / 3,720; counterfactual 739 / 756) from its preserved attempt snapshot;'],
  ['5. hold R3 at an exact 3,720 / 3,720 with all closed controls preserved, and close the remaining 58 failing counterfactual queries through generic structural rules, without reopening any R3 row or richer-context shape;',
    '5. hold R3 at an exact 3,720 / 3,720 with all closed controls and the seven-shape rich-context guard preserved, and close the remaining 17 failing counterfactual queries through generic structural rules, without reopening any R3 row or guard shape;'],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 56).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('updates applied; missed =', missed);
