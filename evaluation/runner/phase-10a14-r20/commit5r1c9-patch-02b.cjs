// PHASE-10A14-R20 COMMIT 5R1-C9 — iteration 02 refinement.
// The ordinary-procedural reading must yield whenever an explicit tax predicate governs
// the target. "Is importation of X subject to customs duty?" is a customs question even
// though X names an ordinary activity; the governing relation, not the object noun,
// decides. Narrow the ordinary-domain list to nouns that cannot be a taxable subject.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');

// 1. Remove nouns that can legitimately be the OBJECT of a tax question
//    (goods, parcel, school, club, membership, insurance, holiday, meeting, sports...).
//    Keep only senses that are themselves non-tax activities or artefacts.
const oldOrd = s.match(/const ORDINARY_PROCEDURAL_DOMAIN_RE = \/.*\/i;/);
if (!oldOrd) throw new Error('ordinary domain regex missing');
const newOrd = 'const ORDINARY_PROCEDURAL_DOMAIN_RE = /\\b(?:librar\\w*|borrow\\w*|showroom|crockery|sofa|projector|student|students|pupil|classroom|semester|choir|roster|alphabetical|alphabeti[sz]e|css|stylesheet|typeface|\\bfont\\b|function|console|routine|build|log panel|spreadsheet|folder|archive|summons|judicial|appeal bond|position paper|board changes|minutes of the board|warranty|ferry|noticeboard|lobby|signage|pantry|carpool|hiking|chess|fun run(?! .*(?:duty|tax))|science project|stage lighting|daylight schedule|theme file|layout sheet)\\b/i;';
s = s.replace(oldOrd[0], newOrd);

// 2. An explicit tax predicate governing the target defeats the ordinary reading.
const evAnchor = '  const ordinaryProceduralSense = ORDINARY_PROCEDURAL_DOMAIN_RE.test(fullLo) && !TAX_DOMAIN_OBJECT_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
const newEv = [
  '  // An explicit tax predicate governing the target always defeats the ordinary reading:',
  '  // the governing relation decides, not the object noun.',
  '  const governingTaxPredicate = /\\b(?:subject to (?:tax|vat|withholding|customs|excise|percentage tax|final tax)|customs dut\\w*|import dut\\w*|deductib\\w*|taxab\\w*|vatable|withholding tax|value[- ]added tax|income tax|capital gains tax|documentary stamp|final tax|excise tax|percentage tax|estate tax|tax treatment|tax rate|tax due|buwis)\\b/i.test(fullLo);',
  '  const ordinaryProceduralSense = ORDINARY_PROCEDURAL_DOMAIN_RE.test(fullLo)',
  '    && !TAX_DOMAIN_OBJECT_RE.test(fullLo) && !governingTaxPredicate;',
].join('\n');
s = s.replace(evAnchor, newEv);

fs.writeFileSync(p, s);
console.log('refined ordinary-procedural sense');
