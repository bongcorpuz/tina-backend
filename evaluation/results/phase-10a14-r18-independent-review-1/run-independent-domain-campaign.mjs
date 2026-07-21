import fs from 'fs';
import path from 'path';
import { detectPhilippineTaxBoundary } from '../../../services/philippine-tax-domain-boundary.js';

const outDir = 'evaluation/results/phase-10a14-r18-independent-review-1';
const oraclePath = path.join(outDir, '15_independent_unseen_domain_oracle.json');
const resultPath = path.join(outDir, '15_independent_unseen_domain_campaign.json');
const rows = [];
const add = (coverageClass, text, expected, note = '') => rows.push({ id: `IR18-DOM-${String(rows.length + 1).padStart(3, '0')}`, coverageClass, text, expected, note });
const addMany = (coverageClass, expected, items, note='') => items.forEach(t => add(coverageClass, t, expected, note));

const taxNouns = ['VAT return','VAT invoice','input VAT','output VAT','withholding tax','expanded withholding tax','final withholding tax','income tax return','BIR Form 1701','BIR Form 2550Q','NIRC section','Revenue Regulation','RMC guidance','BIR ruling','tax refund','tax credit certificate','estate tax','donor tax','documentary stamp tax','percentage tax','excise tax','capital gains tax','customs duty','import duty','tariff classification','Bureau of Customs assessment','BOC customs clearance','MCIT','RCIT','gross estate','net estate','optional standard deduction','OSD election','SLSP filing','Alphalist attachment','books of accounts','official receipt','deficiency assessment','Formal Letter of Demand','FLD assessment','Notice for Informal Conference','administrative protest','reinvestigation request','reconsideration request','prescriptive period for assessment','compromise penalty','surcharge for late filing','transfer pricing documentation','permanent establishment','registered business enterprise','EOPT law','Oplan Kandado','BIR Letter of Authority','Court of Tax Appeals petition','tax treaty relief','PEZA income tax holiday','local business tax','real property tax','withholding certificate','substantiation for deductions','deductible representation expense','fringe benefit tax','de minimis benefits','taxable compensation','taxable sale','zero-rated sale','VAT-exempt sale','gross receipts tax','minimum corporate income tax','regular corporate income tax','deficiency VAT','deficiency withholding tax','stock transaction tax','principal residence CGT','tax-free exchange','customs broker duty issue','post-clearance audit','dutiable value','ad valorem duty','CMTA import rule','BIR audit defense','tax protest deadline','FDDA appeal','FAN response','PAN reply','tax delinquency','tax lien','tax sparing','double tax agreement','Philippine tax residency','resident alien tax','non-resident citizen tax','withholding on rent','tax on professional fees','VAT registration','eFPS filing','eBIRForms filing','TIN registration','BIR registration','local tax situs','situs of taxation','tax accounting period','fiscal year tax filing','quarterly percentage tax','monthly withholding remittance','annual information return','BIR assessment notice','taxpayer remedies','refund claim prescription','customs tariff rate','imported goods VAT','subject to VAT'];
addMany('explicit_tax', 'ALLOW', taxNouns.slice(0,120));

const nonTax = ['CSS grid layout','font kerning in a typeface','color palette selection','paint drying time','audio chord progression','music band schedule','guitar chord chart','software variable naming','TypeScript interface design','JavaScript promise handling','React component state','SQL query optimization','database index tuning','API endpoint latency','GitHub pull request labels','astronomy black hole facts','biology cell membrane','chemistry reaction rate','physics momentum problem','geology rock cycle','medical prescription dosage','pharmacology trial design','clinical diagnosis checklist','court filing in civil procedure','criminal procedure arraignment','family law annulment','political campaign strategy','presidential election trivia','basketball game score','football standings','travel itinerary in Cebu','hotel recommendation','recipe for adobo','baking temperature','movie review','song lyrics request','relationship advice','love letter draft','religious sermon outline','Bible study question','stock trading strategy','crypto wallet seed phrase','forex market analysis','business marketing plan','real-estate listing copy','lease contract renewal without tax','private lease weekend deadline','office duty roster','customs in a culture class','capital city trivia','capital letter typography','gain setting on amplifier','return statement in JavaScript','filing cabinet organization','deadline for homework','penalty kick rule','surcharge in a delivery app','deductible in insurance policy','gross estate marketing phrase','prescriptive period in medicine','Alphalist as alphabetical list','SLSP as unknown project code','OSD as on-screen display','FLD as field abbreviation','MCIT as random product code','RCIT as random training code','BOC as band of chords','VAT as color palette','taxable CSS class name','BIR as a bird typo','TIN can material','FAN cooling speed','CTA button wording','LOA in aviation','PAN cooking utensil','FAN noise level','RR railroad timetable','RMC music channel','gross receipts for a school raffle','official receipt layout design','books of accounts as novel list','transfer pricing in a board game','permanent establishment in architecture','registered business enterprise as a game guild','surcharge in shipping checkout','compromise offer in negotiation class','reconsideration request for exam grade','reinvestigation in detective fiction','notice for informal conference agenda','formal letter demand in English class','deficiency in vitamin D','assessment in classroom rubric','customs as social traditions','tariff as phone plan','import duty in a game quest','Bureau of Customs as building directions only','estate sale marketing','gross estate landscaping','prescription period for antibiotics','subject to VAT as variable name in code','VAT return as function return value','input VAT as form input label','output VAT as console output label','taxable font file','taxable typeface license','capital-gain knob on amplifier','BOC audio acronym','BOC chord sheet','VAT paint swatch','VAT hue token','deductible insurance excess','exemption in a game rule','rate in audio sample','threshold in image processing','period in grammar','deadline in school calendar','return due in library books'];
addMany('explicit_non_tax', 'NOT_ALLOW', nonTax.slice(0,120));

const trapsBase = [
  'What is the taxable font in this CSS file?', 'Which taxable typeface renders best?', 'Rename the taxable CSS class.', 'Set the taxable variable to true.', 'What is taxable in this TypeScript enum?', 'How do I close a VAT color palette?', 'Pick a VAT paint shade.', 'Sample the VAT hue from this image.', 'Use VAT as a design token name.', 'Where is the VAT swatch?', 'Is BOC a band of chords?', 'Write BOC chord tabs.', 'What is BOC in audio mixing?', 'Does the BOC band play jazz?', 'Tune the BOC chord progression.', 'Explain capital gain on an amplifier.', 'Increase capital-gain knob level.', 'Use capital as a font style.', 'What is a customs tradition?', 'What local customs apply at weddings?', 'Return the VAT variable from a function.', 'Input VAT into this web form field.', 'Output VAT to the console.', 'Make a taxable font-face rule.', 'Add taxable to the CSS class list'
];
for (let i=0;i<4;i++) trapsBase.forEach(t => add('substring_homograph_trap', `${t} Variant ${i+1}.`, 'NOT_ALLOW'));

const ambiguous = ['Is this deductible?','What is the exemption?','Is there a surcharge?','What is the penalty?','What is the period?','What is the deadline?','What is the rate?','What is the threshold?','What is the holding period?','What is the tariff?','When is the return due?','What is the filing deadline?','Can this be credited?','Is this exempt?','Does this need registration?','Is this subject to assessment?','Can I protest this?','Can I appeal this?','What form should I use?','What is the notice period?'];
for (let i=0;i<4;i++) ambiguous.forEach(t => add('ambiguous', `${t} Context ${i+1}.`, 'NOT_ALLOW'));

const taglish = ['Ano ang VAT return sa Pilipinas?','Paano mag-file ng BIR Form 1701?','Kailan due ang withholding tax?','Magkano ang income tax sa compensation?','Ano ang buwis sa sale?','Paano ang input VAT at output VAT?','Ano ang BIR audit defense?','May surcharge ba sa late filing ng tax return?','Ano ang MCIT para sa corporation?','Ano ang RCIT sa Pilipinas?','Ano ang gross estate for estate tax?','Paano mag-submit ng SLSP?','Ano ang Alphalist attachment?','Ano ang OSD election?','Ano ang FLD sa tax assessment?','Paano mag-protest ng deficiency assessment?','Ano ang prescriptive period for BIR assessment?','Deductible ba ang representation expense?','Ano ang customs duty sa imported goods?','Ano ang tariff classification sa BOC?'];
for (let i=0;i<3;i++) taglish.forEach(t => add('filipino_taglish', `${t} Batch ${i+1}.`, 'ALLOW'));

const mmPairs = [
 ['Is compensation taxable in the Philippines?','Is this font taxable in CSS?'],
 ['What is the VAT on this sale?','What is the VAT shade in this palette?'],
 ['What are BOC customs duties?','Is BOC a band of chords?'],
 ['What is the customs duty on imports?','What local customs apply at dinner?'],
 ['What is capital gains tax?','What is capital gain on an amplifier?'],
 ['How do I get a BIR TIN?','What is a tin can made of?'],
 ['What is a FAN in a tax assessment?','How loud is this cooling fan?'],
 ['Can I appeal to the CTA?','What does the CTA button do?'],
 ['What is an FLD in a tax assessment?','What does FLD mean as a field abbreviation?'],
 ['What is OSD for deductions?','What is OSD on a monitor?'],
 ['What is SLSP filing?','What does SLSP mean in my software project?'],
 ['What is an Alphalist attachment?','Make an alphabetical list of names.'],
 ['What is gross estate for estate tax?','Write real-estate marketing copy.'],
 ['What is the prescriptive period for assessment?','What is the medical prescription period?'],
 ['Is software subject to VAT?','Where is the VAT variable in software?'],
 ['Must I issue a VAT invoice?','Design a VAT invoice icon only.'],
 ['What is input VAT?','Input VAT into a text box.'],
 ['What is output VAT?','Output VAT from a function.'],
 ['What expenses are deductible?','What is my insurance deductible?'],
 ['What are customs duties?','What are cultural customs?'],
 ['What is taxable compensation?','What is a taxable CSS class?'],
 ['What is BOC customs clearance?','What is BOC in audio?'],
 ['What is MCIT?','Use MCIT as a random SKU.'],
 ['What is RCIT?','Use RCIT as a course code.'],
 ['What is a compromise penalty?','Draft a compromise offer in a negotiation class.'],
 ['What is a surcharge for late filing?','What is a delivery surcharge?'],
 ['What is a deficiency assessment?','What is a vitamin deficiency?'],
 ['What is a Notice for Informal Conference?','Plan an informal conference agenda.'],
 ['What is a Formal Letter of Demand?','Write a formal demand letter for grammar class.'],
 ['What is transfer pricing documentation?','Price transfers in a board game.']
];
mmPairs.forEach(([tax, non]) => { add('metamorphic', tax, 'ALLOW', 'tax side'); add('metamorphic', non, 'NOT_ALLOW', 'non-tax side'); });

const acronym = ['What is MCIT in Philippine corporate income tax?','In music software, MCIT is my plugin code; what could it stand for?','What is RCIT for a domestic corporation?','RCIT is my robotics course ID; define it generically.','What is FLD in a BIR assessment?','FLD means field in my spreadsheet; explain the acronym.','What is OSD for Philippine tax deductions?','What is OSD on a monitor display?','What is SLSP filing for VAT taxpayers?','SLSP is an unknown acronym in my app logs.','What is an Alphalist for withholding tax?','Make an alphalist of students alphabetically.','What is BOC customs clearance?','BOC means band of chords in this song.','What is VAT registration?','VAT is a color token in my design system.','What is taxable income?','taxable is a CSS class in my stylesheet.','What is gross estate for estate tax?','Gross estate means ugly real-estate ads here.','What is the prescriptive period for tax assessment?','What is the prescription period for antibiotics?','What is a FAN assessment notice?','FAN is a cooling fan device.','What is CTA jurisdiction in tax cases?','CTA is a call-to-action button.','What is PAN in BIR assessment process?','Pan is a cooking tool.','What is TIN registration?','Tin is a metal can.','What is RR No. 2-98?','RR is a railroad abbreviation.','What is RMC guidance from BIR?','RMC is a radio music channel.','What is eFPS filing?','EFPS is a random software flag.','What is CMTA for customs duties?','CMTA is a club acronym with no tax context.'];
acronym.forEach((t, i) => add('acronym_context', i % 2 === 0 ? 'ALLOW' : 'NOT_ALLOW', t));

const oracle = { task: 'PHASE-10A14-R18-INDEPENDENT-REVIEW-1', frozenAt: new Date().toISOString(), total: rows.length, requiredMinimums: { explicit_tax: 120, explicit_non_tax: 120, substring_homograph_trap: 100, ambiguous: 80, filipino_taglish: 60, metamorphic: 60, acronym_context: 40 }, byClass: rows.reduce((a,r)=>{a[r.coverageClass]=(a[r.coverageClass]||0)+1; return a;},{}), rows };
fs.writeFileSync(oraclePath, JSON.stringify(oracle, null, 2) + '\n');

const results = rows.map(r => {
  const d = detectPhilippineTaxBoundary(r.text, '/ask');
  const pass = r.expected === 'ALLOW' ? d.decision === 'ALLOW' : d.decision !== 'ALLOW';
  const failureKind = pass ? null : (r.expected === 'ALLOW' ? 'material_false_refusal' : 'material_false_allow');
  return { ...r, decision: d.decision, reason: d.reason, detectedDomain: d.detectedDomain, confidence: d.confidence, pass, failureKind };
});
const byClass = {};
for (const r of results) {
  const c = byClass[r.coverageClass] ||= { total: 0, pass: 0, materialFalseAllows: 0, materialFalseRefusals: 0, clarifyErrors: 0 };
  c.total++; if (r.pass) c.pass++;
  if (r.failureKind === 'material_false_allow') c.materialFalseAllows++;
  if (r.failureKind === 'material_false_refusal') c.materialFalseRefusals++;
  if (!r.pass && r.decision === 'CLARIFY') c.clarifyErrors++;
}
let metamorphicFailures = 0;
const mm = results.filter(r => r.coverageClass === 'metamorphic');
for (let i=0;i<mm.length;i+=2) if (!mm[i].pass || !mm[i+1].pass) metamorphicFailures++;
const failed = results.filter(r => !r.pass);
const out = { task: oracle.task, oraclePath, generatedAt: new Date().toISOString(), total: results.length, passed: results.filter(r=>r.pass).length, materialFalseAllows: failed.filter(r=>r.failureKind==='material_false_allow').length, materialFalseRefusals: failed.filter(r=>r.failureKind==='material_false_refusal').length, clarifyErrors: failed.filter(r=>r.decision==='CLARIFY').length, metamorphicFailures, byClass, failedIds: failed.map(r => ({ id: r.id, coverageClass: r.coverageClass, text: r.text, expected: r.expected, decision: r.decision, reason: r.reason, failureKind: r.failureKind })), results };
fs.writeFileSync(resultPath, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.passed}/${out.total} pass falseAllow=${out.materialFalseAllows} falseRefusal=${out.materialFalseRefusals} mmFail=${out.metamorphicFailures}`);
if (failed.length) console.log(failed.slice(0,20).map(f => `${f.id} ${f.expected}->${f.decision} ${f.text}`).join('\n'));
