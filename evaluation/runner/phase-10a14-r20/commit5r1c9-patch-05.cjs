// PHASE-10A14-R20 COMMIT 5R1-C9 — iteration 05 structural corrections.
//
// (1) Clause hierarchy: when a governed tax relation and a non-tax action relation are
//     both present, the tax relation controls if the tax predicate governs the primary
//     target. A subordinate or incidental action must not veto the primary tax task.
//     This covers "Explain <instrument> for a BIR assessment" and the Filipino
//     withholding rows, where the relation already exists but loses precedence.
// (2) A subordinate label clause ("... if PAN is a product code") must not veto a
//     genuine tax question about the sale.
// (3) A named statute or code in a tax question is subject matter, not label binding.
// (4) A contentless deictic keeps REFUSE even when a tax attribute is named
//     ("What is the holding period? Context 1.").
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// ---------------------------------------------------------------- evidence
const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // Clause hierarchy: a governed tax relation over the primary target outranks a\n'
  + '  // competing non-tax action relation that is incidental or subordinate to it.\n'
  + '  const taxRelationOverPrimaryTarget = /\\b(?:vatable|subject to (?:vat|tax|withholding|customs|excise|percentage tax|final tax)|i-?withhold ang buwis sa|buwis sa|may vat ba ang|deductible ba ang|tamang bir form para sa)\\b/i.test(fullLo);\n'
  + '  // A subordinate clause that merely states a token is a code must not veto the\n'
  + '  // primary tax question ("Is X sale VATable if X is a product code?").\n'
  + '  const subordinateCodeClause = /\\b(?:if|although|though|even though|while|when)\\b[^?]*\\b(?:is|are|serves as|acts as)\\b[^?]*\\b(?:product code|internal code|project code|warehouse code|item code|reference code|label|codename)\\b/i.test(fullLo);\n'
  + '  // A named statute, code or agency inside a tax question is subject matter, not a\n'
  + '  // user instruction to name or label an object.\n'
  + '  const namedStatuteInTaxQuestion = /\\b(?:tariff and customs code|national internal revenue code|nirc|ease of paying taxes(?: act)?|train law|create law|customs modernization(?: and tariff)? act|revenue regulations?|revenue memorandum (?:circular|order))\\b/i.test(fullLo)\n'
  + '    && /\\b(?:affect|apply|applies|govern|cover|change|require|impose|allow|under|what does)\\b/i.test(fullLo);');

const objAnchor = 'filipinoTaxRelationOverTarget, ordinaryCreativeAction };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'filipinoTaxRelationOverTarget, ordinaryCreativeAction, taxRelationOverPrimaryTarget, subordinateCodeClause, namedStatuteInTaxQuestion };');

// ---------------------------------------------------------------- decision precedence
// A governed tax relation over the primary target outranks a competing non-tax action.
const nonTaxRule = "  if (requestsNonTax && !hasTreatment && !hasCompliance) return decide('REFUSE', 'explicit_non_tax_task', 0.90);";
if (!s.includes(nonTaxRule)) throw new Error('non-tax rule missing');
s = s.replace(nonTaxRule,
  '  // Clause hierarchy: the primary tax task controls when a governed tax predicate\n'
  + '  // governs the target, even if an incidental non-tax action verb is also present.\n'
  + "  if (requestsNonTax && !hasTreatment && !hasCompliance && !evidence.taxRelationOverPrimaryTarget\n"
  + "      && !(asksDefinition && evidence.acronymResolvedByTaxContext)) {\n"
  + "    return decide('REFUSE', 'explicit_non_tax_task', 0.90);\n"
  + '  }\n'
  + "  // A definition request over a recognised instrument in explicit tax context is a\n"
  + "  // governed tax definition regardless of an incidental explanatory verb.\n"
  + "  if (asksDefinition && evidence.acronymResolvedByTaxContext && !namesLabel && !expandsNonTax && !quotesTerm) {\n"
  + "    return decide('ALLOW', 'tax_definition_with_context', 0.80);\n"
  + '  }\n'
  + "  // A governed tax predicate over the primary target controls a competing non-tax\n"
  + "  // action reading.\n"
  + "  if (requestsNonTax && evidence.taxRelationOverPrimaryTarget && !namesLabel && !quotesTerm\n"
  + "      && !evidence.ordinaryCreativeAction && !evidence.stylingOrProgramTarget) {\n"
  + "    return decide('ALLOW', 'tax_treatment_of_ordinary_object', 0.85);\n"
  + '  }');

// A subordinate code clause must not turn a tax question into label binding.
const labelRule = "  if (namesLabel && !hasTreatment && !hasCompliance) return decide('REFUSE', 'non_tax_label_or_name', 0.90);";
if (!s.includes(labelRule)) throw new Error('label rule missing');
s = s.replace(labelRule,
  "  if (namesLabel && !hasTreatment && !hasCompliance\n"
  + "      && !(evidence.subordinateCodeClause && evidence.taxRelationOverPrimaryTarget)\n"
  + "      && !evidence.namedStatuteInTaxQuestion) {\n"
  + "    return decide('REFUSE', 'non_tax_label_or_name', 0.90);\n"
  + '  }\n'
  + "  // A subordinate code clause under a governed tax predicate, or a named statute in a\n"
  + "  // tax question, is subject matter rather than a naming instruction.\n"
  + "  if (namesLabel && (evidence.subordinateCodeClause || evidence.namedStatuteInTaxQuestion)\n"
  + "      && evidence.taxRelationOverPrimaryTarget) {\n"
  + "    return decide('ALLOW', 'tax_treatment_of_ordinary_object', 0.85);\n"
  + '  }');

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
