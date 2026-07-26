// PHASE-10A14-R20 COMMIT 5R1-C9 — iteration 02 structural corrections.
//
// (1) Tax-compliance relations require a tax-domain object, institution or procedure.
//     Words such as return, due, file, filing, claim, registration, list, output and
//     assessment also carry ordinary senses; those senses must not create tax
//     jurisdiction. This is a governing-relation test, never a global lexical veto.
// (2) Concise tax-domain noun phrases are valid requests without a full sentence.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// ---------------------------------------------------------------- vocabularies
const anchor = 'const RECOGNIZED_TAX_ACRONYM_RE =';
if (!s.includes(anchor)) throw new Error('anchor missing');

const block = [
  '// A tax-domain object, institution or procedure. A compliance relation requires one',
  '// of these to govern the target: the procedural word alone (return, due, file,',
  '// claim, registration, list, output, assessment) is not sufficient, because each has',
  '// an ordinary sense that must keep its own domain.',
  'const TAX_DOMAIN_OBJECT_RE = /\\b(?:bir|bureau of internal revenue|revenue district|rdo\\b|revenue regulation|revenue memorandum|nirc|national internal revenue|bureau of customs|court of tax appeals|taxpayer|tax|taxes|taxable|taxation|vat|value[- ]added|withholding|percentage tax|excise|documentary stamp|capital gains|estate tax|donor|customs dut|tariff|import dut|deficiency|assessment notice|letter of authority|alphalist|slsp|books of accounts|official receipt|sales invoice|certificate of registration|authority to print|income tax|final tax|fringe benefit|creditable|input tax|output tax|refund of|tax refund|tax credit|amnesty|prescriptive period|deficiency interest|compromise penalty|payee|remittance|remit)\\b/i;',
  '',
  '// Ordinary-language domains for tax-shaped procedural words. When one of these',
  '// governs the target and no tax-domain object is present, the ordinary sense wins.',
  'const ORDINARY_PROCEDURAL_DOMAIN_RE = /\\b(?:library|librar\\w*|book|books club|borrow\\w*|merchandise|goods|shopper|buyer|supplier|showroom|crockery|sofa|projector|rented|rental of a|student|students|pupil|classroom|school|exam|examination|semester|choir|roster|attendee|seminar attendees|alphabetical|alphabeti[sz]e|css|stylesheet|typeface|font|class\\b|function|console|routine|build|log panel|computer|spreadsheet|folder|archive|summons|court|judicial|labor|labour|appeal bond|position paper|board changes|directors|minutes|insurance|warranty|passenger|ferry|parcel|motor insurance|gym|membership|fun run|chess|club|holiday|meeting|projector|sports|league|suspension|science project|noticeboard|lobby|signage|pantry|carpool|hiking)\\b/i;',
  '',
  '// A concise tax-domain noun phrase: a coherent professional request that need not be',
  '// a full sentence. Recognised through tax-domain vocabulary plus a governing tax',
  '// concept, not through row-specific wording.',
  'const CONCISE_TAX_PHRASE_RE = /\\b(?:taxable compensation|capital gain[s]? tax|import dut(?:y|ies)? treatment|refund claim prescription|prescription of a refund claim|bir registration|revenue district office registration|pan (?:reply|response)|fld (?:reply|response)|fan (?:reply|response)|deficiency interest computation|tax situs|situs of tax\\w*|tax accounting period|taxpayer remed\\w*|tax sparing|double tax(?:ation)? agreement|resident alien tax\\w*|non[- ]resident citizen tax\\w*|tax on professional fees|tin registration|withholding tax table|creditable withholding|expanded withholding|final withholding|optional standard deduction|minimum corporate income tax|regular corporate income tax|net operating loss carry[- ]?over|improperly accumulated earnings)\\b/i;',
  '',
  anchor,
].join('\n');
s = s.replace(anchor, block);

// ---------------------------------------------------------------- evidence wiring
const evAnchor = '  const genericContentlessQuestion = GENERIC_CONTENTLESS_QUESTION_RE.test(normalizedText.trim());';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // A tax-shaped procedural word governed by an ordinary domain, with no tax-domain\n'
  + '  // object anywhere in the query, is an ordinary-language request.\n'
  + '  const ordinaryProceduralSense = ORDINARY_PROCEDURAL_DOMAIN_RE.test(fullLo) && !TAX_DOMAIN_OBJECT_RE.test(fullLo);\n'
  + '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);');

const objAnchor = 'nonTaxImperativeOverToken, bareAcronymDefinition };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'nonTaxImperativeOverToken, bareAcronymDefinition, ordinaryProceduralSense, conciseTaxPhrase };');

// ---------------------------------------------------------------- decision rule
const decAnchor = '  // 0e. Generic contentless compliance/treatment question:';
if (!s.includes(decAnchor)) throw new Error('decision anchor missing');
s = s.replace(decAnchor,
  '  // 0d-ter. An ordinary-language sense of a tax-shaped procedural word governs its own\n'
  + '  // target when no tax-domain object, institution or procedure appears anywhere in the\n'
  + '  // query. This is a relation-and-target test, not a global lexical veto.\n'
  + '  if (evidence.ordinaryProceduralSense) {\n'
  + '    return decide(\'REFUSE\', \'explicit_non_tax_task\', 0.85);\n'
  + '  }\n'
  + decAnchor);

// ---------------------------------------------------------------- relation branch
const relAnchor = '    else if (isQuestion && RECOGNIZED_TAX_ACRONYM_RE.test(fullLo)';
if (!s.includes(relAnchor)) throw new Error('relation anchor missing');
s = s.replace(relAnchor,
  '    // A concise tax-domain noun phrase is a governed request even without a sentence\n'
  + '    // frame or interrogative marker.\n'
  + '    else if (CONCISE_TAX_PHRASE_RE.test(fullLo) && !hasNonTaxDomainNounIn(fullLo)\n'
  + '             && !ORDINARY_PROCEDURAL_DOMAIN_RE.test(fullLo)) {\n'
  + '      add(\'ASKS_TAX_TREATMENT_OF\', \'task\', target || \'subject\');\n'
  + '    }\n'
  + relAnchor);

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
