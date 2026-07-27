// PHASE-10A14-R20 COMMIT 5R1-C19 — remaining CURRENT_STATE section updates.
const fs = require('fs');
const p = 'knowledge/CURRENT_STATE.md';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  // reconstruction narrative
  [`Reconstructed accepted C17 base (new governed campaign, controlling):

\`\`\`text
canonical overall = 3,243 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,243 / 3,720   (477 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  304 / 344
collision probes        =  134 / 196
reconstruction discrepancies = 0 (exact identity match on every metric)
\`\`\`

The C17 dev-05 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`90983f57…\`, and only an authorized runtime file
differed from the live baseline.

Best accepted C18 reason candidate:

\`\`\`text
canonical overall = 3,313 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,313 / 3,720   (407 mismatches, from 477)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  320 / 344   (from 304)
collision probes        =  134 / 196   (held)
\`\`\``,
    `Reconstructed accepted C18 base (new governed campaign, controlling):

\`\`\`text
canonical overall = 3,313 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,313 / 3,720   (407 mismatches)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  320 / 344
collision probes        =  134 / 196
reconstruction discrepancies = 0 (exact identity match on every metric)
\`\`\`

The C18 dev-05 snapshot was verified file-by-file against the required normalized-LF
hashes and the services tree digest \`09081d31…\`, and only an authorized runtime file
differed from the live baseline.

Best accepted C19 reason candidate:

\`\`\`text
canonical overall = 3,337 / 3,720
R3 decision       = 3,720 / 3,720
R3 relation       = 3,720 / 3,720   (0 mismatches)
R3 reason         = 3,337 / 3,720   (383 mismatches, from 407)
decision counterfactual = 756 / 756
relation counterfactual =  282 / 282
clause probes     =    68 / 68
reason-focused suite    =  320 / 344   (held)
collision probes        =  140 / 196   (from 134)
\`\`\``],

  // remaining clusters
  [`the reason lane remains OPEN: 407 mismatches, of which a measured 323 are REACHABLE
  under the extended feature set and 84 are not
\`\`\`

C18 replaced the ceiling question with an **acceptance question**. Rather than asking how`,
    `the reason lane remains OPEN: 383 mismatches, of which a measured 306 are REACHABLE
  and 77 are not
\`\`\`

C19 added a second acceptance property. C18 established that a rule must be measured
against the rows its exact condition changes; C19 established that the simulator and the
runtime must evaluate the **same predicate**, and then discovered that predicate identity
is still not sufficient — a rule can match exactly the right rows and still divert others
through its placement. Both properties are now required.

C18 replaced the ceiling question with an **acceptance question**. Rather than asking how`],

  // iterations
  [`Material iterations: 5 of 5 permitted were used in C18 — three accepted and one
rejected, with one further iteration spent re-simulating a rule whose runtime placement
was wrong. The rejected candidate had a clean forecast but was gated on a predicate the
controlling branch does not use, so the guard never fired and R3 regressed 448 → 454; it
was rejected and the prior snapshot restored, then re-simulated against the actual branch
predicate and landed 41 rows plus 14 reason-suite rows. No candidate carrying a
regression was registered as an accepted base. No clean reason-lock verification was run,
because §14 authorizes it only after reason mismatches reach zero.`,
    `Material iterations: 5 registered material iterations were used in C19 — two accepted
and two rejected, plus one spent recovering a rule whose runtime placement was wrong.
Both rejections concerned the same rule: it passed branch equivalence 6 = 6 yet regressed
R3 393 → 403 because the branch it replaced also served 28 rows the predicate never
matched, and hoisting it to the head of the decision walk regressed further to 460. Both
were rejected and the prior snapshot restored. No candidate carrying a regression was
registered as an accepted base. No clean reason-lock verification was run, because §15
authorizes it only after reason mismatches reach zero.

The C18 iteration count is corrected here: the registry records **four** material C18
iterations, not five. See the reconciliation section above.`],
];

let missed = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.log('MISS: ' + a.slice(0, 70).replace(/\n/g, '\\n')); missed++; }
  else s = s.replace(a, b);
}
fs.writeFileSync(p, s);
console.log('applied; missed =', missed);
