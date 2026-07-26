// PHASE-10A14-R20 COMMIT 5R1-C12 — CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // reconstruction block
  ['Reconstructed accepted C10 base (new governed campaign, controlling):\n\n```text\noverall        = 3,097 / 3,720\ndecision       = 3,720 / 3,720\ncounterfactual =   698 / 756\nreconstruction discrepancies = 0 (exact identity match, including the counterfactual score)\n```\n\nThe C10 dev-06 snapshot was verified file-by-file, against its recorded identity manifest\nand against the required services tree digest `42360fea…`, and only an authorized runtime\nfile differed from the live baseline.\n\nBest governed C11 candidate:\n\n```text\nR3 decision    = 3,720 / 3,720\ncounterfactual =   739 / 756\n```',
    'Reconstructed accepted C11 base (new governed campaign, controlling):\n\n```text\nR3 decision    = 3,720 / 3,720\ncounterfactual =   739 / 756\nreconstruction discrepancies = 0 (exact identity match on all nine metrics)\n```\n\nThe C11 dev-07 snapshot was verified file-by-file against the required normalized-LF\nhashes and the services tree digest `8c0ac833…`, and only an authorized runtime file\ndiffered from the live baseline.\n\nLocked C12 candidate:\n\n```text\nR3 decision    = 3,720 / 3,720\ncounterfactual =   756 / 756\n```'],
  // lock-status paragraph
  ['The exact R3 decision ceiling was preserved through every accepted iteration and\nreproduced in a separate clean verification campaign against an unchanged runtime.\n**Seven of the eight lock conditions are met.** The lock additionally requires the\ncomplete combined counterfactual suite to pass, and 17 of 756 queries still fail, so the\ndecision lock is **not declared**. That condition is recorded as unmet, not waived.\n\nRemaining counterfactual failures by suite:\n\n```text\nv3  0 / 331\nv4  6 / 177\nv5  6 / 134\nv6  5 / 114\n```',
    'The exact R3 decision invariant was enforced on every candidate. Three intermediate\ncandidates regressed R3 (to 3,701, 3,714 and 3,715); each was diagnosed and corrected\nwithin the same iteration, and no candidate carrying an R3 regression was ever registered\nas an accepted base.\n\nRemaining counterfactual failures by suite:\n\n```text\nv3  0 / 331\nv4  0 / 177\nv5  0 / 134\nv6  0 / 114\n```'],
  // anti-overfit finding
  ['Anti-overfit finding — leakage found and removed:\n\n```text\nA new gate check (no_complete_counterfactual_query) fired. Two v4 counterfactual entries,\nthemselves bare tax phrases, had their exact text added to the runtime vocabulary during\nC9, so those queries were passing by name rather than by structure. Both strings were\nremoved from the runtime vocabulary; the generic alternatives still cover the concept.\nThe counterfactual score fell from 741/756 to 739/756 as a direct result. That cost was\naccepted rather than concealed: a score that depends on memorised suite text is not a\nreal score. R3 was unaffected and anti-overfit now passes 21/21.\n```',
    'Anti-memorization finding — leakage found and removed:\n\n```text\nThe C12 gate lowered the leakage threshold to three words and fired immediately. Three\nwhole counterfactual queries had their exact text in the runtime vocabulary from C9, and\ntwo whole R3 rows were hard-coded as homograph patterns inherited from the pre-C7\nbaseline. All five were removed or replaced with generic structural patterns; the\ncounterfactual score fell 739 to 737 as the honest cost.\n\nA third category was assessed and deliberately NOT removed: 24 canonical Philippine tax\nterms ("capital gains tax", "books of accounts") that coincide with bare-term R3 rows. A\ntax analyzer cannot function without that vocabulary, so term-shaped overlap is recorded\nas domain vocabulary rather than counted as memorization. The check now separates the two\ncases and reports the terminology overlap in every attempt.\n```'],
  // expectation adjudication
  ['All 58 failures in the pre-coding contract were assessed against their own family rule and\nthe governing architecture. All 58 were found structurally valid, so no suite defect was\ndemonstrated and no counterfactual expectation was edited.',
    'The 19-row pre-coding contract carried forward the C11 adjudication: every row was\npreviously assessed as structurally valid. No counterfactual expectation was edited in\nC12, and the suite denominator was not increased — closure is 756/756 on the existing\nsuite with no new controlling queries added.'],
  // counterfactual controls
  ['best candidate result = 739 / 756  (v3 331/331, v4 171/177, v5 128/134, v6 109/114)',
    'locked candidate result = 756 / 756  (v3 331/331, v4 177/177, v5 134/134, v6 114/114)'],
  // remaining work
  ['Remaining work is confined to the 17 failing counterfactual queries, which cover generic\nstructural families rather than R3 rows.',
    'No decision-layer work remains: both the R3 decision partition and the counterfactual\nfailure set are empty. Remaining Phase 10A work is the relation lane, then the reason\nlane, then standalone closure.'],
  // iterations
  ['Material iterations: 5 of 5 permitted were used. One further flat candidate was recorded\nand superseded, and one anti-overfit remediation removed counterfactual-query leakage\nfound by the gate. A separate clean lock-verification campaign was executed against an\nunchanged runtime and is recorded in full.',
    'Material iterations: 4 of 5 permitted were used, all accepted. A separate clean\nlock-verification campaign was executed against an unchanged runtime and is recorded in\nfull.'],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 60).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
