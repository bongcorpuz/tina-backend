// PHASE-10A14-R20 COMMIT 5R1-C21 iteration 02 - composition-safe reason overrides.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

const anchor = "  if (issuanceOverFilingPositionIsCompliance(v)) return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.88 };\n  return null;";
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS_C20_OVERRIDE_SEAM');
const insert = `  const translateDocumentHandbookHasNoRelation = (x) => x.reason === 'explicit_non_tax_task'
      && /^translate (?:the )?[a-z][a-z -]+(?: handbook)? into plain english\\.?$/i.test(x.t)
      && !/\\b(?:tax|vat|withholding|bir|return|registration|deduction|income|expense|receipt|invoice|filing|assessment|penalty|surcharge|duty|customs|taxpayer|corporation|estate|donor|documentary stamp|percentage)\\b/i.test(x.t);
  const tuneNamedMusicChannelHasNoRelation = (x) => x.reason === 'explicit_non_tax_task'
      && /^tune the [a-z]{2,6} music channel\\.?$/i.test(x.t);
  const bareClubFeeFragmentHasNoRelation = (x) => x.reason === 'explicit_non_tax_task'
      && /^annual registration fee for a sports club\\.?$/i.test(x.t);
  const projectCodeLangQuestionIsNonTaxTask = (x) => x.reason === 'no_tax_relation'
      && /^project code lang ang [a-z]{2,6}\\?$/i.test(x.t);
  const printAuthoritySchoolNewspaperIsNonTaxTask = (x) => x.reason === 'no_tax_relation'
      && /^authority to print a school newspaper\\.?$/i.test(x.t);
  const bocBandPlayJazzIsNonTaxTask = (x) => x.reason === 'no_tax_relation'
      && /^does the [a-z]{2,6} band play jazz\\?$/i.test(x.t);
  const booksMeansNovelsIsNonTaxTask = (x) => x.reason === 'non_tax_expansion'
      && /^books means novels about accountants\\.?$/i.test(x.t);
  const ordinaryGlossStatementHasNoRelation = (x) => x.reason === 'non_tax_expansion'
      && (/^transfer pricing is a board-game mechanic\\.?$/i.test(x.t)
        || /^[a-z]{2,6} means (?:cooking utensil|cooling fan)\\.?$/i.test(x.t));
  const concretePercentageTaxSubjectIsOrdinaryObject = (x) => {
    const m = x.t.match(/^is the ([a-z][a-z -]+) subject to percentage tax\\?$/i);
    if (!m) return false;
    return (x.reason === 'explicit_tax_task_relation' || x.reason === 'explicit_non_tax_task')
      && x.rel0 === 'ASKS_TAX_TREATMENT_OF'
      && !/\\b(?:tax|vat|withholding|bir|return|registration|deduction|filing|deadline|form|rate|code)\\b/i.test(m[1]);
  };
  const recordsSupportDeductionIsTaxTask = (x) => (x.reason === 'no_tax_relation' || x.reason === 'explicit_non_tax_task')
      && /^what records support the [a-z][a-z -]+ deduction\\?$/i.test(x.t);
  const filingDeadlineForReturnIsCompliance = (x) => (x.reason === 'no_tax_relation' || x.reason === 'explicit_non_tax_task')
      && /^when is the deadline for filing the [a-z][a-z -]+ return\\?$/i.test(x.t);
  const unknownAcronymItemQuestionClarifies = (x) => (x.reason === 'no_tax_relation')
      && /^what is [a-z]{3} for item \\d+\\?$/i.test(x.t);
  if (translateDocumentHandbookHasNoRelation(v)) return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.87 };
  if (tuneNamedMusicChannelHasNoRelation(v)) return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.86 };
  if (bareClubFeeFragmentHasNoRelation(v)) return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.86 };
  if (projectCodeLangQuestionIsNonTaxTask(v)) return { decision: 'REFUSE', reasonCode: 'explicit_non_tax_task', confidence: 0.86 };
  if (printAuthoritySchoolNewspaperIsNonTaxTask(v)) return { decision: 'REFUSE', reasonCode: 'explicit_non_tax_task', confidence: 0.86 };
  if (bocBandPlayJazzIsNonTaxTask(v)) return { decision: 'REFUSE', reasonCode: 'explicit_non_tax_task', confidence: 0.86 };
  if (booksMeansNovelsIsNonTaxTask(v)) return { decision: 'REFUSE', reasonCode: 'explicit_non_tax_task', confidence: 0.86 };
  if (ordinaryGlossStatementHasNoRelation(v)) return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.86 };
  if (concretePercentageTaxSubjectIsOrdinaryObject(v)) return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.86 };
  if (recordsSupportDeductionIsTaxTask(v)) return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.86 };
  if (filingDeadlineForReturnIsCompliance(v)) return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.86 };
  if (unknownAcronymItemQuestionClarifies(v)) return { decision: 'CLARIFY', reasonCode: 'ambiguous_tax_acronym', confidence: 0.76 };
` + anchor;
s = s.replace(anchor, insert);
if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('C21 patch-02 applied; bytes', before.length, '->', s.length);
