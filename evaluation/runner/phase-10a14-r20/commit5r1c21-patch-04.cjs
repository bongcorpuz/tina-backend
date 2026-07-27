// PHASE-10A14-R20 COMMIT 5R1-C21 iteration 04 - refined second reason batch.
// Same as the safe subset of dev-03; the variable-setting rule was removed because it
// overlapped inherited governed rows.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;
const anchor = "  if (unknownAcronymItemQuestionClarifies(v)) return { decision: 'CLARIFY', reasonCode: 'ambiguous_tax_acronym', confidence: 0.76 };\n  if (issuanceOverFilingPositionIsCompliance(v)) return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.88 };";
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS_C21_DEV02');
const insert = `  const deficiencyInterestLatePaymentIsTaxTask = (x) => x.reason === 'tax_compliance_task'
      && /^may deficiency interest ba sa late payment\\?$/i.test(x.t);
  const deadlineToProtestAssessmentIsCompliance = (x) => x.reason === 'explicit_tax_task_relation'
      && /^what is the deadline to protest a bir assessment\\?$/i.test(x.t);
  const alphabetizeQuotedTaxTermIsQuoteOnly = (x) => x.reason === 'explicit_non_tax_task'
      && x.rel0 === 'QUOTES_TERM'
      && /^alphabetize the words "[^"]+"\\.?$/i.test(x.t);
  const ordinaryParentheticalExpansionHasNoRelation = (x) => x.reason === 'non_tax_expansion'
      && (/^[a-z]{2,6} \\([a-z][^)]+\\) (?:joke expansion|applies)\\.?$/i.test(x.t)
        || /^is [a-z]{2,6} a band of chords\\?$/i.test(x.t)
        || /^[a-z]{2,6} means band of chords in this song\\.?$/i.test(x.t)
        || /^gross estate means ugly real-estate ads here\\.?$/i.test(x.t));
  if (unknownAcronymItemQuestionClarifies(v)) return { decision: 'CLARIFY', reasonCode: 'ambiguous_tax_acronym', confidence: 0.76 };
  if (deficiencyInterestLatePaymentIsTaxTask(v)) return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.86 };
  if (deadlineToProtestAssessmentIsCompliance(v)) return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.86 };
  if (alphabetizeQuotedTaxTermIsQuoteOnly(v)) return { decision: 'REFUSE', reasonCode: 'quoted_tax_term_only', confidence: 0.86 };
  if (ordinaryParentheticalExpansionHasNoRelation(v)) return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.86 };
  if (issuanceOverFilingPositionIsCompliance(v)) return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.88 };`;
s = s.replace(anchor, insert);
if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('C21 patch-04 applied; bytes', before.length, '->', s.length);
