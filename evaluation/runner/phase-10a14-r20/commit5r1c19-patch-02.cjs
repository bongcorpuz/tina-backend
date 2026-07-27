// PHASE-10A14-R20 COMMIT 5R1-C19 iteration 02 — definition_outcome_under_tax_context.
//
// The predicate below is INJECTED VERBATIM from commit5r1c19-predicates.mjs. The patch
// script reads that module, extracts the three helper functions the rule depends on, and
// writes them into the runtime unchanged. The simulator, the runtime and the trace
// harness therefore evaluate byte-identical logic — the C18 failure mode (a simulator
// condition the runtime branch does not use) cannot occur.
//
// Simulated: support 14, TP 14, FP_CORRECT_ROW_REGRESSION 0, FP_WRONG_TO_DIFFERENT_WRONG 0.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- extract the shared predicate source, verbatim -------------------------------
const shared = fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c19-predicates.mjs', 'utf8');
const grab = (name) => {
  const m = shared.match(new RegExp('export const ' + name + ' = \\(v\\) =>([\\s\\S]*?);\\n', 'm'));
  if (!m) throw new Error('PREDICATE_NOT_FOUND ' + name);
  return m[1].trim();
};
const asksMeaningBody = grab('asksMeaningOfTerm');
const taxContextBody = grab('hasControllingTaxContext');
if (!asksMeaningBody.includes('what does') || !taxContextBody.includes('bir')) {
  throw new Error('PREDICATE_EXTRACTION_SANITY_FAILED');
}

// ---- inject into the runtime evidence layer --------------------------------------
const evAnchor = `  const reasonNamingComplement = `;
if (!s.includes(evAnchor)) throw new Error('ANCHOR_MISS reasonNamingComplement');
const evNew = `  // C19 §8 — SHARED BRANCH PREDICATE, injected verbatim from
  // evaluation/runner/phase-10a14-r20/commit5r1c19-predicates.mjs. The simulator calls
  // the same source. Do not edit here: edit the shared module and re-inject.
  const c19View = { t: primaryTextLo, normalized: String(normalizedText || '') };
  const c19AsksMeaningOfTerm = (v) => ${asksMeaningBody};
  const c19HasControllingTaxContext = (v) => ${taxContextBody};
  // §10D — the requested OUTCOME is the meaning of a term, asked inside genuine tax
  // context. Surrounding procedural or compliance vocabulary does not change it.
  const reasonDefinitionOutcomeUnderTaxContext = c19AsksMeaningOfTerm(c19View)
    && c19HasControllingTaxContext(c19View);
  const reasonNamingComplement = `;
s = s.replace(evAnchor, evNew);

const bag = `reasonNamingComplement,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonNamingComplement, reasonDefinitionOutcomeUnderTaxContext,`);

// ---- decision: placed at the head, ahead of every branch that can claim these rows --
// The simulated condition is `reason in {explicit_tax_task_relation, tax_compliance_task}`,
// i.e. rows those two families would otherwise take. Placing the test first and gating it
// on the definitional outcome reproduces exactly that set.
const head = `  const quotesTerm = has('QUOTES_TERM');`;
if (!s.includes(head)) throw new Error('ANCHOR_MISS decision head');
s = s.replace(head, `  const quotesTerm = has('QUOTES_TERM');

  // C19 R1 (§10D) — a definitional request under genuine tax context is a tax
  // definition, not a residual tax task and not a compliance task.
  // Simulated: support 14, corrects 14, regresses 0 currently-correct rows.
  if (evidence.reasonDefinitionOutcomeUnderTaxContext
      && !namesLabel && !quotesTerm && !expandsNonTax && !requestsNonTax) {
    return decide('ALLOW', 'tax_definition_with_context', 0.85);
  }`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-02 applied; predicate injected verbatim; bytes', before.length, '->', s.length);
