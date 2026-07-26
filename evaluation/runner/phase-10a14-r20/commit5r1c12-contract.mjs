// PHASE-10A14-R20 COMMIT 5R1-C12 — counterfactual failure contract, built before coding.
import fs from 'node:fs';
import * as L from './commit5r1c12-lib.mjs';
import { loadRuntime } from './commit5r1c2-oracle-runner.mjs';

const rt = await loadRuntime('standalone');
const cf = L.runCounterfactuals(rt.classify);

const METADATA_SUFFIX = /\b(?:context|situation|item|matter|reference|case|scenario|group|batch|set|variant|sample|mixed)\s+[a-z]{0,3}-?\d+\s*[.?!]?\s*$/i;
const DEICTIC = /\b(it|its|this|that|these|those|they)\b/i;
const ANTECEDENT_VERB = /\b(bought|purchased|acquired|paid|received|sold|leased|imported|hired|engaged|rented)\b/i;
const LABEL_ACTION = /\b(nam(e|ed|ing)|call(ed)?|label(l?ed)?|tag(ged)?|rename|title(d)?|store|save|print|caption|display)\b/i;
const QUOTED_TASK = /\b(spell|reverse|count the|letters?|alphabeti[sz]\w*|format the|repeat the|sort the)\b/i;
const TAX_PREDICATE = /\b(deductib\w*|subject to (?:vat|tax|withholding|customs|excise|final tax|percentage tax)|value[- ]added tax|withholding tax|customs dut\w*|import dut\w*|dutiable|capital gains? tax|documentary stamp|final tax|excise tax|percentage tax|estate tax|taxab\w*|vatable|input tax|output tax|tax due|tax rate)\b/i;
const TAX_PROCEDURE = /\b(bir\b|revenue district|revenue issuance|revenue memorandum|tax return|annual return|alphalist|tax clearance|refund|tax credit|registration fee|taxpayer|assessment|audit|deficiency|prescriptive period|prescription|remit\w*|withholding rate)\b/i;
const ORDINARY_DOMAIN = /\b(library|atlas|blender|crockery|sofa|showroom|shopper|customer|traveller|coach|ferry|parcel|warranty|insurance|badminton|chess|tournament|fun run|club|gym|membership|birthday|party|school|exam|trainee|choir|roster|pantry|carpool|hiking|noticeboard|lobby|signage|projector|newsletter|bulletin|raffle|calendar|caterer|motor)\b/i;
const PROGRAM_DOMAIN = /\b(css|stylesheet|typeface|font|class|function|console|routine|build|log panel|spreadsheet|folder|archive|wiki|template|web form|form field|dashboard|icon|shade|colour|color|palette|caption|summary page)\b/i;
const NAMED_STATUTE = /\b(?:tariff and customs code|national internal revenue code|nirc|ease of paying taxes|train law|create law|customs modernization|cmta)\b/i;
const SUBORDINATE_CODE = /\b(?:if|although|though|even though|while|when)\b[^?]*\b(?:code|tag|label)\b|\b(?:filed|booked|stored|tagged|labelled|labeled|bears|carries)\b[^?]*\b(?:code|tag)\b/i;
const ACRONYM = /\b[A-Z]{2,6}\b/;

const targetCompleteness = (q) => {
  if (QUOTED_TASK.test(q) && /["“”']/.test(q)) return 'QUOTED_TEXT';
  if (LABEL_ACTION.test(q) && !SUBORDINATE_CODE.test(q)) return 'LABEL_OR_NAME';
  const stripped = q.replace(METADATA_SUFFIX, '').trim();
  if (stripped !== q.trim()) return DEICTIC.test(stripped) ? 'CONTENTLESS_DEICTIC' : 'CONCRETE';
  if (ANTECEDENT_VERB.test(q) && DEICTIC.test(q)) return 'RESOLVED_FROM_SAME_QUERY';
  if (DEICTIC.test(q) && !ANTECEDENT_VERB.test(q)) return 'CONTENTLESS_DEICTIC';
  if (ACRONYM.test(q) && q.trim().split(/\s+/).length <= 3) return 'AMBIGUOUS';
  return 'CONCRETE';
};

const primaryTask = (q) => {
  if (QUOTED_TASK.test(q)) return 'TEXT_MANIPULATION';
  if (/^(?:please\s+)?(?:name|rename|label|tag|title|call|store|save|print|caption|display)\b/i.test(q.trim())) return 'LABEL_OR_DISPLAY_ACTION';
  if (NAMED_STATUTE.test(q)) return 'STATUTE_SUBJECT';
  if (TAX_PREDICATE.test(q)) return 'TAX_TREATMENT';
  if (TAX_PROCEDURE.test(q)) return 'TAX_PROCEDURE';
  if (/\b(what (?:is|are|does)|define|explain|describe|clarify|interpret)\b/i.test(q)) return 'DEFINITION';
  return 'UNDETERMINED';
};

/** Correction class, expressed as a rule shape rather than row wording. */
function correctionClass(r) {
  if (r.expected === 'ALLOW' && r.actual !== 'ALLOW') {
    if (r.primaryTaskType === 'STATUTE_SUBJECT') return 'STATUTE_AS_SUBJECT_MATTER';
    if (r.subordinateCodeClause) return 'PRIMARY_TAX_OVER_SUBORDINATE_CODE';
    if (r.targetCompletenessType === 'RESOLVED_FROM_SAME_QUERY') return 'ANTECEDENT_RESOLVED_TARGET';
    if (r.primaryTaskType === 'TAX_PROCEDURE') return 'TAX_PROCEDURE_WITH_DOMAIN_ATTACHMENT';
    if (r.targetCompletenessType === 'AMBIGUOUS') return 'CANONICAL_ACRONYM_IN_TAX_CONTEXT';
    return 'GOVERNED_PREDICATE_OVER_CONCRETE_TARGET';
  }
  if (r.expected === 'REFUSE' && r.actual !== 'REFUSE') {
    if (r.primaryTaskType === 'LABEL_OR_DISPLAY_ACTION') return 'LABEL_OR_DISPLAY_ACTION_CONTROLS';
    if (r.ordinaryEvidence) return 'ORDINARY_DOMAIN_CONTROLS';
    if (r.programEvidence) return 'PROGRAM_ARTEFACT_CONTROLS';
    if (r.targetCompletenessType === 'CONTENTLESS_DEICTIC') return 'CONTENTLESS_TARGET_REFUSES';
    return 'NO_CONTROLLING_TAX_RELATION';
  }
  if (r.expected === 'CLARIFY') return 'POLYSEMOUS_WITHOUT_CONTEXT_CLARIFIES';
  return 'RESOLVE_VIA_PRIMARY_TASK_AND_TARGET';
}

const rows = cf.failures.map((f) => {
  const base = {
    suite: f.suite, family: f.family,
    queryHash: L.sha256(Buffer.from(f.query)).slice(0, 16),
    query: f.query, pairedContrast: f.contrast,
    expected: f.expected, actual: f.actual, direction: `${f.expected}->${f.actual}`,
    primaryClause: f.query.split(/(?<=[.?!])\s+/)[0] || f.query,
    primaryTaskType: primaryTask(f.query),
    governedTarget: (f.query.match(/\b(?:the|a|an)\s+([a-z][a-z\- ]{2,32}?)\s+(?:is|are|subject|deductib|dutiable|taxab)/i) || [])[1] || '(inline)',
    targetCompletenessType: targetCompleteness(f.query),
    taxDomainEvidence: TAX_PREDICATE.test(f.query) || TAX_PROCEDURE.test(f.query),
    nonTaxEvidence: ORDINARY_DOMAIN.test(f.query) || PROGRAM_DOMAIN.test(f.query),
    ordinaryEvidence: ORDINARY_DOMAIN.test(f.query),
    programEvidence: PROGRAM_DOMAIN.test(f.query),
    subordinateCodeClause: SUBORDINATE_CODE.test(f.query),
    namedStatute: NAMED_STATUTE.test(f.query),
    ruleCurrentlyFiring: `${f.actual} (see attempt trace for the exact precedence rule)`,
    expectationStatus: 'STRUCTURALLY_VALID_PREVIOUSLY_ADJUDICATED',
  };
  base.genericStructuralDefect = base.expected === 'ALLOW'
    ? 'a governed tax relation over the target is not being built or is outranked'
    : 'a non-tax primary task or domain is not controlling the decision';
  base.proposedCorrectionClass = correctionClass(base);
  return base;
});

const tally = (k) => rows.reduce((a, r) => { a[r[k]] = (a[r[k]] || 0) + 1; return a; }, {});
const hashes = new Set(rows.map((r) => r.suite + ':' + r.queryHash));

const contract = {
  unit: 'COMMIT 5R1-C12', generatedUtc: new Date().toISOString(),
  builtBeforeAnyRuntimeChange: true,
  counterfactualFailures: cf.failed, contractRows: rows.length,
  missing: cf.failed - rows.length, duplicates: rows.length - hashes.size,
  expectationConflicts: 0,
  expectationPolicy: 'All rows were adjudicated as structurally valid in C11. No expectation is edited in C12; any future edit requires a separately versioned adjudication artifact proving a genuine suite defect.',
  bySuite: tally('suite'), byFamily: tally('family'), byDirection: tally('direction'),
  byPrimaryTask: tally('primaryTaskType'), byTargetCompleteness: tally('targetCompletenessType'),
  byCorrectionClass: tally('proposedCorrectionClass'),
  rows,
};
L.writeJson(L.RES + 'COMMIT_5R1C12_COUNTERFACTUAL_FAILURE_CONTRACT.json', contract);

console.log('contract rows =', rows.length, '| missing =', contract.missing, '| duplicates =', contract.duplicates, '| expectationConflicts = 0');
console.log('bySuite         ', JSON.stringify(contract.bySuite));
console.log('byDirection     ', JSON.stringify(contract.byDirection));
console.log('byCorrectionClass', JSON.stringify(contract.byCorrectionClass, null, 1));
