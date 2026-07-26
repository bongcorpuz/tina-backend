// PHASE-10A14-R20 COMMIT 5R1-C9 — iteration 03 refinement.
//
// (1) A tax-canonical acronym used as the requested tax concept is self-resolving and
//     needs its own rule: for "What is MCIT?" neither the surrounding-tax-word test nor
//     the authority-term test can fire, because the token IS the whole subject.
//     Polysemous tokens are excluded and still CLARIFY without context.
// (2) An explanatory verb over a tax instrument in explicit tax context is a definition
//     request, not a non-tax action.
// (3) A styling/programming object governs its own target: a tax predicate applied to a
//     stylesheet class, typeface or function return does not create tax jurisdiction.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// (1) canonical-acronym definition rule, placed before the ambiguity fallbacks
const ambAnchor = "    if (anyAmbiguous) return decide('CLARIFY', 'ambiguous_tax_acronym', 0.55);";
if (!s.includes(ambAnchor)) throw new Error('ambiguity fallback missing');
s = s.replace(ambAnchor,
  "    // A tax-canonical acronym has no material competing ordinary sense, so using it as\n"
  + "    // the requested tax concept is a governed tax definition even with no other context.\n"
  + "    if (evidence.taxCanonicalAcronym && !evidence.nonTaxExpansionBinding) {\n"
  + "      return decide('ALLOW', 'tax_definition_with_context', 0.78);\n"
  + "    }\n"
  + ambAnchor);

// (2) explanatory verb over a tax instrument in explicit tax context is a definition
const naAnchor = '  const explicitTaxPredicateGovernsTarget =';
if (!s.includes(naAnchor)) throw new Error('predicate anchor missing');
s = s.replace(naAnchor,
  '  // An explanatory verb applied to a tax instrument in explicit tax context is a\n'
  + '  // definition request about that instrument, not an ordinary non-tax action.\n'
  + '  const explanatoryOverTaxInstrument = /^(?:please\\s+)?(?:explain|describe|clarify|interpret|detail|summari[sz]e)\\b/i.test(fullLo.trim())\n'
  + '    && RECOGNIZED_TAX_ACRONYM_RE.test(fullLo) && EXPLICIT_TAX_CONTEXT_RE.test(fullLo);\n'
  + naAnchor);

const gate = '  const taskIsNonTaxAction = !namesTaxInstrument && !filipinoTaxPredicate\n';
if (!s.includes(gate)) throw new Error('non-tax-action gate missing');
s = s.replace(gate, '  const taskIsNonTaxAction = !namesTaxInstrument && !filipinoTaxPredicate && !explanatoryOverTaxInstrument\n');

// make the definition relation fire for that shape
const defAnchor = '  if (taskIsDefinition && !taskIsNonTaxAction) add(\'ASKS_DEFINITION_OF\', \'task\', target || \'term\');';
if (!s.includes(defAnchor)) throw new Error('definition relation anchor missing');
s = s.replace(defAnchor,
  '  if ((taskIsDefinition || explanatoryOverTaxInstrument) && !taskIsNonTaxAction) add(\'ASKS_DEFINITION_OF\', \'task\', target || \'term\');');

// (3) styling / programming objects govern their own target
const styAnchor = 'const ORDINARY_PROCEDURAL_DOMAIN_RE =';
if (!s.includes(styAnchor)) throw new Error('ordinary domain anchor missing');
s = s.replace(styAnchor,
  '// Styling and programming artefacts govern their own target. A tax-shaped predicate\n'
  + '// applied to a stylesheet class, typeface, console output or function return is a\n'
  + '// homograph of the tax sense and creates no tax jurisdiction.\n'
  + 'const STYLING_OR_PROGRAM_OBJECT_RE = /\\b(?:css|stylesheet|style sheet|typeface|\\bfont\\b|font weight|class\\b|classname|selector|theme file|layout sheet|console|function|routine|method|variable|parameter|return value|web form|form field|text box|placeholder|markup|html|javascript|typescript)\\b/i;\n'
  + '\n'
  + styAnchor);

const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // A styling or programming artefact governs its own target unless a genuine tax\n'
  + '  // institution or instrument is also named.\n'
  + '  const stylingOrProgramTarget = STYLING_OR_PROGRAM_OBJECT_RE.test(fullLo)\n'
  + '    && !/\\b(?:bir|bureau of internal revenue|nirc|revenue (?:regulation|memorandum|district)|philippine tax|customs|taxpayer)\\b/i.test(fullLo);');

const objAnchor = 'conciseTaxPhrase, acronymResolvedByTaxContext, taxCanonicalAcronym };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'conciseTaxPhrase, acronymResolvedByTaxContext, taxCanonicalAcronym, stylingOrProgramTarget };');

const decAnchor = '  // 0d-ter. An ordinary-language sense of a tax-shaped procedural word governs';
if (!s.includes(decAnchor)) throw new Error('decision anchor missing');
s = s.replace(decAnchor,
  '  // 0d-bis-2. A styling or programming artefact governs its own target: a tax-shaped\n'
  + '  // predicate over it is a homograph, not a tax relation.\n'
  + '  if (evidence.stylingOrProgramTarget) {\n'
  + "    return decide('REFUSE', 'explicit_non_tax_task', 0.86);\n"
  + '  }\n'
  + decAnchor);

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
