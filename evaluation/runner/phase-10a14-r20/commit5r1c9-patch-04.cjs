// PHASE-10A14-R20 COMMIT 5R1-C9 — iteration 04 structural corrections.
//
// (1) The recognised-acronym vocabulary omitted several BIR instruments (RMC, PAN, FLD,
//     FAN, RMO, RR, CAR, BOC, CTA), so an explanatory request over them in explicit BIR
//     context was still read as an ordinary action.
// (2) A Filipino/Taglish withholding predicate over a concrete target is a tax relation.
// (3) An ordinary creative/selection action over a tax-shaped modifier keeps its own
//     domain: picking a paint shade or designing an icon is not a tax question.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// (1) widen recognised BIR instrument tokens
const m = s.match(/const RECOGNIZED_TAX_ACRONYM_RE = \/.*\/i;/);
if (!m) throw new Error('recognised acronym regex missing');
s = s.replace(m[0],
  'const RECOGNIZED_TAX_ACRONYM_RE = /\\b(?:cgt|cwt|ewt|fwt|dst|mcit|rcit|iaet|nolco|osd|vat|gret|fbt|rmc|rmo|rdo|pan|fld|fan|fdda|boc|cta|slsp|atp|cor|tin)\\b/i;');

// (2) Filipino withholding predicate over a concrete target
const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // A Filipino/Taglish withholding or tax predicate governing a named object is a\n'
  + '  // governed tax relation: "i-withhold ang buwis sa <object>" asks whether tax must\n'
  + '  // be withheld on that object.\n'
  + '  const filipinoTaxRelationOverTarget = /\\bi-?withhold ang buwis sa\\s+\\S|\\bbuwis sa\\s+\\S|\\bmay vat ba ang\\s+\\S|\\bdeductible ba ang\\s+\\S|\\btamang bir form para sa\\s+\\S/i.test(fullLo);');

// (3) ordinary creative / selection action over a tax-shaped modifier
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // An ordinary creative or selection action governs its own target even when a\n'
  + '  // tax-shaped word modifies the object ("pick a VAT paint shade", "design a VAT\n'
  + '  // invoice icon"): the artefact, not a tax relation, is what is requested.\n'
  + '  const ordinaryCreativeAction = /^(?:please\\s+)?(?:pick|choose|select|design|draw|sketch|paint|colou?r|style|illustrate|render|mock up|prototype)\\b/i.test(normalizedText.trim())\n'
  + '    && /\\b(?:shade|colou?r|palette|icon|logo|banner|poster|graphic|theme|swatch|mockup|wallpaper|sticker)\\b/i.test(fullLo);');

const objAnchor = 'taxCanonicalAcronym, stylingOrProgramTarget };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'taxCanonicalAcronym, stylingOrProgramTarget, filipinoTaxRelationOverTarget, ordinaryCreativeAction };');

// decision rule for the ordinary creative action, ahead of tax-relation rules
const decAnchor = '  // 0d-bis-2. A styling or programming artefact governs its own target';
if (!s.includes(decAnchor)) throw new Error('decision anchor missing');
s = s.replace(decAnchor,
  '  // 0d-bis-1. An ordinary creative or selection action over an artefact governs its\n'
  + '  // own target; a tax-shaped modifier does not create tax jurisdiction.\n'
  + '  if (evidence.ordinaryCreativeAction) {\n'
  + "    return decide('REFUSE', 'explicit_non_tax_task', 0.86);\n"
  + '  }\n'
  + decAnchor);

// the Filipino relation must defeat the non-tax-action reading and add a relation
const gate = '  const taskIsNonTaxAction = !namesTaxInstrument && !filipinoTaxPredicate && !explanatoryOverTaxInstrument\n';
if (!s.includes(gate)) throw new Error('non-tax-action gate missing');
s = s.replace(gate,
  '  const filipinoTaxRelationOverTargetLocal = /\\bi-?withhold ang buwis sa\\s+\\S|\\bbuwis sa\\s+\\S|\\bmay vat ba ang\\s+\\S|\\bdeductible ba ang\\s+\\S|\\btamang bir form para sa\\s+\\S/i.test(fullLo);\n'
  + '  const taskIsNonTaxAction = !namesTaxInstrument && !filipinoTaxPredicate && !explanatoryOverTaxInstrument && !filipinoTaxRelationOverTargetLocal\n');

const relAnchor = '    // A concise tax-domain noun phrase is a governed request even without a sentence';
if (!s.includes(relAnchor)) throw new Error('relation anchor missing');
s = s.replace(relAnchor,
  '    // A Filipino/Taglish tax predicate governing a named object is a tax relation.\n'
  + '    else if (filipinoTaxRelationOverTargetLocal) {\n'
  + "      add(/\\bvat\\b/i.test(fullLo) ? 'ASKS_VAT_TREATMENT_OF' : (/\\bwithhold/i.test(fullLo) ? 'ASKS_WITHHOLDING_ON' : 'ASKS_TAX_TREATMENT_OF'), 'task', target || 'subject');\n"
  + '    }\n'
  + relAnchor);

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
