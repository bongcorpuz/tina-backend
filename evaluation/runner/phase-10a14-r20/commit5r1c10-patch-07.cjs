// PHASE-10A14-R20 COMMIT 5R1-C10 — counterfactual generalization pass.
//
// R3 is at zero mismatches; these corrections target generic structural families that
// the combined counterfactual suite still fails, without touching R3 behaviour.
//
// (1) "delivery motorcycle" hits a non-tax domain noun ("delivery") even though an
//     explicit deductibility predicate governs it. A governed tax predicate over the
//     target must defeat the domain-noun veto, as it already does elsewhere.
// (2) A bare materially polysemous acronym must CLARIFY, not REFUSE, when nothing
//     resolves it.
// (3) A polysemous acronym inside an explicit tax-procedure question is resolved.
// (4) A naming/tagging action in ANY clause makes label binding the primary task, even
//     when another clause is an ordinary non-tax action.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// (1) governed tax predicate defeats the domain-noun veto in relation building
const dnAnchor = '  const hasNonTaxDomainNoun = hasNonTaxDomainNounIn(fullLo);';
if (!s.includes(dnAnchor)) throw new Error('domain noun anchor missing');
s = s.replace(dnAnchor,
  '  // An explicit tax-treatment predicate governing the target defeats the domain-noun\n'
  + '  // veto: the governing relation decides, not an incidental noun in the phrase.\n'
  + '  const governedTaxPredicateOverTarget = /\\b(?:deductib\\w*|subject to (?:vat|tax|withholding|customs|excise|percentage tax|final tax)|value[- ]added tax|withholding tax|customs dut\\w*|import dut\\w*|capital gains tax|documentary stamp|final tax|excise tax|percentage tax|estate tax|taxab\\w*|vatable|input tax|output tax)\\b/i.test(fullLo);\n'
  + '  const hasNonTaxDomainNoun = hasNonTaxDomainNounIn(fullLo) && !governedTaxPredicateOverTarget;');

// (2)+(3) polysemous acronym: bare -> CLARIFY; with tax procedure -> resolved
const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // A materially polysemous acronym with nothing to resolve it is ambiguous, not a\n'
  + '  // refusal: the correct response is to ask which sense is meant.\n'
  + '  const barePolysemousAcronym = /^[a-z]{2,5}\\s*\\??\\.?$/i.test(normalizedText.trim())\n'
  + '    && !TAX_CANONICAL_ACRONYM_RE.test(fullLo);\n'
  + '  // A polysemous acronym inside an explicit tax procedure or treatment question is\n'
  + '  // resolved by that context.\n'
  + '  const acronymInTaxProcedureQuestion = /\\b[a-z]{2,6}\\b/i.test(fullLo)\n'
  + '    && /\\b(?:annual return|quarterly return|tax return|filing|file[sd]?\\b|remit\\w*|bir\\b|withholding|assessment|audit|registration)\\b/i.test(fullLo)\n'
  + '    && /\\b(?:required|needed|attach\\w*|submit\\w*|include[sd]?|support\\w*)\\b/i.test(fullLo);');

const objAnchor = 'orderingActionOverOrdinaryPopulation, contractQuestionAboutTaxClause, bareTaxabilityQuestion };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'orderingActionOverOrdinaryPopulation, contractQuestionAboutTaxClause, bareTaxabilityQuestion, barePolysemousAcronym, acronymInTaxProcedureQuestion };');

// decision: bare polysemous acronym clarifies before the final fallbacks
const fallback = '  if (requestsNonTax || ordinaryLexical > 0 || namesLabel) return decide(\'REFUSE\', \'explicit_non_tax_task\', 0.85);';
if (!s.includes(fallback)) throw new Error('fallback missing');
s = s.replace(fallback,
  '  if (evidence.barePolysemousAcronym) return decide(\'CLARIFY\', \'ambiguous_tax_acronym\', 0.55);\n'
  + fallback);

// acronym-in-tax-procedure resolves ambiguity
const ambRule = '  if (acr.some((a) => a.ambiguous)) {';
if (!s.includes(ambRule)) throw new Error('ambiguity rule missing');
s = s.replace(ambRule,
  '  if (evidence.acronymInTaxProcedureQuestion && !namesLabel && !quotesTerm && !expandsNonTax && !requestsNonTax) {\n'
  + "    return decide('ALLOW', 'tax_compliance_task', 0.82);\n"
  + '  }\n'
  + ambRule);

// (4) a naming/tagging action in any clause makes label binding primary
const labelAnchor = '  const filenameBinding =';
if (!s.includes(labelAnchor)) throw new Error('label anchor missing');
s = s.replace(labelAnchor,
  '  // A naming, tagging or titling action over a token in ANY clause makes label binding\n'
  + '  // the primary task, even when another clause is an ordinary non-tax action.\n'
  + '  const namingActionAnyClause = /\\b(?:name|rename|label|tag|title|call)\\s+(?:the\\s+|this\\s+|our\\s+)?(?:folder|file|sheet|tab|column|field|document|record|deck|invite|project)\\b/i.test(fullLo);\n'
  + labelAnchor);

const lbAnchor = '  const labelBinding = filenameBinding || columnOrFieldBinding || (labelNoun.test(fullLo)';
if (!s.includes(lbAnchor)) throw new Error('labelBinding anchor missing');
s = s.replace(lbAnchor, '  const labelBinding = namingActionAnyClause || filenameBinding || columnOrFieldBinding || (labelNoun.test(fullLo)');

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
