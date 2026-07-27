// PHASE-10A14-R20 COMMIT 5R1-C20 iteration 02 — placement-safe shadow-override seam.
//
// §8 requires that no existing branch be replaced, reordered, broadened or narrowed.
// This patch therefore:
//   1. renames the existing selector body to decideTaxBoundaryFromEvidenceOriginal,
//      BYTE-IDENTICAL apart from its name;
//   2. adds a new exported wrapper that consults a PURE override helper and otherwise
//      delegates to the untouched original.
//
// Every unmatched row therefore executes exactly the same code path it did before, which
// is what placement non-interference asserts. The override predicate is injected verbatim
// from commit5r1c20-override.mjs, so shadow mode and runtime evaluate identical logic.
//
// Rule shipped: token_gloss_assigns_no_identifier
//   shadow support 4, TP 4, FP_CORRECT_ROW_REGRESSION 0, FP_WRONG_TO_DIFFERENT_WRONG 0.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- extract the override predicate verbatim ------------------------------------
const shared = fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c20-override.mjs', 'utf8');
const m = shared.match(/token_gloss_assigns_no_identifier: \{[\s\S]*?match: \(v\) =>([\s\S]*?),\n  \},/);
if (!m) throw new Error('PREDICATE_NOT_FOUND token_gloss_assigns_no_identifier');
const matchBody = m[1].trim();
if (!matchBody.includes('non_tax_label_or_name') || !matchBody.includes('abbreviation')) {
  throw new Error('PREDICATE_EXTRACTION_SANITY_FAILED');
}
const hv = shared.match(/export const hasFiniteVerb = \(v\) =>([\s\S]*?);\n/);
if (!hv) throw new Error('PREDICATE_NOT_FOUND hasFiniteVerb');
const finiteVerbBody = hv[1].trim();

// ---- 1. rename the original selector, body untouched ----------------------------
const decl = `export function decideTaxBoundaryFromEvidence(evidence) {`;
if (!s.includes(decl)) throw new Error('ANCHOR_MISS selector declaration');
s = s.replace(decl, `// C20 §8 — the ORIGINAL selector, preserved byte-identical apart from its name. No
// branch inside it is replaced, reordered, broadened or narrowed by this unit.
function decideTaxBoundaryFromEvidenceOriginal(evidence) {`);

// ---- 2. add the pure override helper and the wrapper seam -----------------------
const anchor = `// C20 §8 — the ORIGINAL selector, preserved byte-identical apart from its name.`;
const seam = `/**
 * C20 §8 — PURE governed reason override. No side effects; returns null when unmatched.
 * The predicate below is injected verbatim from
 * evaluation/runner/phase-10a14-r20/commit5r1c20-override.mjs so that shadow mode, the
 * placement gate and this runtime evaluate byte-identical logic. Do not edit here.
 */
function resolveGovernedReasonOverride(evidence) {
  const rels = (evidence.relations || []).map((x) => x.relation);
  const v = {
    t: String(evidence.reasonPrimaryTextLo || ''),
    normalized: String(evidence.normalizedText || ''),
    rels,
    rel0: rels.length ? rels[0] : '(none)',
    reason: evidence.reasonBaselineReason,
    taskVerb: evidence.reasonPrimaryTaskVerb || null,
    taskObject: evidence.reasonPrimaryTaskObject || null,
  };
  const IMPERATIVE_HEAD = ${String(shared.match(/export const IMPERATIVE_HEAD = ([^\n]+);/)[1])};
  const hasFiniteVerb = (x) => ${finiteVerbBody};
  const tokenGlossAssignsNoIdentifier = (x) => ${matchBody};
  if (tokenGlossAssignsNoIdentifier(v)) return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.88 };
  return null;
}

/**
 * C20 §8 — the wrapper seam. The override is consulted first; when it does not match,
 * the original selector runs unchanged, so every unmatched row keeps its exact baseline
 * decision, reason, relations and branch path.
 */
export function decideTaxBoundaryFromEvidence(evidence) {
  const baseline = decideTaxBoundaryFromEvidenceOriginal(evidence);
  const override = resolveGovernedReasonOverride({ ...evidence, reasonBaselineReason: baseline.reasonCode });
  if (override != null) return override;
  return baseline;
}

` + anchor;
s = s.replace(anchor, seam);

// ---- 3. publish the evidence fields the override reads --------------------------
const bagAnchor = `reasonDefinitionOutcomeUnderTaxContext,`;
if (!s.includes(bagAnchor)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bagAnchor, `reasonDefinitionOutcomeUnderTaxContext, reasonPrimaryTextLo: primaryTextLo, reasonPrimaryTaskVerb: primary ? primary.taskVerb : null, reasonPrimaryTaskObject: primary ? primary.taskObject : null,`);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-02 applied; override seam added; bytes', before.length, '->', s.length);
