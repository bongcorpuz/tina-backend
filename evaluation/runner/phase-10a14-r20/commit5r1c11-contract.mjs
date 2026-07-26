// PHASE-10A14-R20 COMMIT 5R1-C11 — 58-row counterfactual failure contract.
// Built BEFORE any runtime change. Includes expectation adjudication: where a suite
// expectation appears inconsistent with its own pair or family rule, the contradiction
// is documented and the original expectation is preserved unchanged.
import fs from 'node:fs';
import * as L from './commit5r1c11-lib.mjs';
import { loadRuntime } from './commit5r1c2-oracle-runner.mjs';

const rt = await loadRuntime('standalone');
const cf = L.runCounterfactuals(rt.classify);

// ── structural probes (surface form only)
const METADATA_SUFFIX = /\b(?:context|situation|item|matter|reference|case|scenario|group|batch|set|variant|sample|mixed)\s+[a-z]{0,3}-?\d+\s*[.?!]?\s*$/i;
const DEICTIC = /\b(it|its|this|that|these|those|they|them)\b/i;
const ANTECEDENT_VERB = /\b(bought|purchased|acquired|paid|received|sold|leased|imported|hired|engaged|rented|built|installed)\b/i;
const LABEL_TASK = /\b(nam(e|ed|ing)|call(ed)?|label(l?ed)?|tag(ged)?|code[d]?|rename|title(d)?|store\s|save\s|filename|column|folder|caption)\b/i;
const QUOTED_TASK = /\b(spell|reverse|uppercase|lowercase|count the|letters?|alphabeti[sz]\w*|format the|repeat the|sort the)\b/i;
const TAX_PREDICATE = /\b(deductib\w*|subject to (?:vat|tax|withholding|customs|excise|final tax|percentage tax)|value[- ]added tax|withholding tax|customs dut\w*|import dut\w*|capital gains? tax|documentary stamp|final tax|excise tax|percentage tax|estate tax|taxab\w*|vatable|input tax|output tax|tax due|tax rate|tax treatment)\b/i;
const TAX_PROCEDURE = /\b(bir\b|revenue district|revenue issuance|revenue memorandum|tax return|annual return|quarterly return|alphalist|tax clearance|refund of|tax refund|tax credit|registration fee|taxpayer|assessment|audit|deficiency|prescriptive period|remit\w*)\b/i;
const ORDINARY_DOMAIN = /\b(library|librar\w*|atlas|blender|crockery|sofa|showroom|shopper|customer|traveller|coach|ferry|parcel|warranty|insurance|badminton|chess|tournament|fun run|club|gym|membership|birthday|party|school|exam|trainee|choir|roster|pantry|carpool|hiking|noticeboard|lobby|signage|projector|newsletter|bulletin|raffle|potluck|picnic|calendar|catering|caterer)\b/i;
const PROGRAM_DOMAIN = /\b(css|stylesheet|typeface|font|class|function|console|routine|build|log panel|spreadsheet|folder|archive|wiki|template|web form|form field|dashboard|icon|shade|colour|color|palette)\b/i;
const ACRONYM = /\b[A-Z]{2,6}\b/;
const SUBORDINATE_CODE = /\b(?:if|although|though|even though|while|when)\b[^?]*\b(?:code|tag|label)\b|\b(?:carries|bears|filed under|booked under|stored under|tagged with|under)\b[^?]*\b(?:code|tag)\b/i;
const NAMED_STATUTE = /\b(?:tariff and customs code|national internal revenue code|nirc|ease of paying taxes|train law|create law|customs modernization|cmta)\b/i;

const targetCompleteness = (q) => {
  if (QUOTED_TASK.test(q) && /["“”']/.test(q)) return 'QUOTED_TEXT';
  if (LABEL_TASK.test(q) && !SUBORDINATE_CODE.test(q)) return 'LABEL_OR_NAME';
  const stripped = q.replace(METADATA_SUFFIX, '').trim();
  const hadSuffix = stripped !== q.trim();
  if (ANTECEDENT_VERB.test(stripped) && DEICTIC.test(stripped)) return 'RESOLVED_FROM_SAME_QUERY';
  if (hadSuffix && DEICTIC.test(stripped)) return 'CONTENTLESS_DEICTIC';
  if (hadSuffix) return 'CONTENTLESS_DEICTIC';
  if (DEICTIC.test(stripped) && !ANTECEDENT_VERB.test(stripped)) return 'CONTENTLESS_DEICTIC';
  if (ACRONYM.test(stripped) && stripped.split(/\s+/).length <= 3) return 'AMBIGUOUS';
  return 'CONCRETE';
};

const primaryTask = (q) => {
  if (QUOTED_TASK.test(q)) return 'TEXT_MANIPULATION';
  if (LABEL_TASK.test(q) && !SUBORDINATE_CODE.test(q)) return 'LABEL_BINDING';
  if (NAMED_STATUTE.test(q)) return 'STATUTE_IN_TAX_QUESTION';
  if (TAX_PREDICATE.test(q)) return 'TAX_TREATMENT';
  if (TAX_PROCEDURE.test(q)) return 'TAX_COMPLIANCE';
  if (/\b(what (?:is|are|does)|define|explain|describe|clarify|interpret)\b/i.test(q)) return 'DEFINITION';
  return 'UNDETERMINED';
};

/** Generic correction, expressed as a rule shape rather than row wording. */
function correction(r) {
  const { expected, actual, primaryTaskType: pt, targetCompletenessType: tc, ordinaryEvidence, programEvidence } = r;
  if (expected === 'ALLOW' && actual !== 'ALLOW') {
    if (pt === 'STATUTE_IN_TAX_QUESTION') return 'A named statute inside a tax question is subject matter and must carry a tax relation.';
    if (pt === 'TAX_TREATMENT') return 'A governed tax predicate over a concrete target must produce a tax relation regardless of an incidental ordinary or program noun elsewhere in the phrase.';
    if (pt === 'TAX_COMPLIANCE') return 'A tax procedure attached to a tax-domain object, institution or instrument must produce a compliance relation.';
    if (pt === 'DEFINITION') return 'A recognised tax concept or an acronym in explicit tax context must resolve to a tax definition.';
    return 'Attach a controlling tax relation to the concrete target named by the governing predicate.';
  }
  if (expected === 'REFUSE' && actual !== 'REFUSE') {
    if (pt === 'LABEL_BINDING') return 'A naming, tagging, storing or captioning action over a token is the primary task and controls the decision.';
    if (pt === 'TEXT_MANIPULATION') return 'A text operation over a token is the primary task and controls the decision.';
    if (ordinaryEvidence) return 'The ordinary-language sense governs the target; require a tax-domain object before any tax relation.';
    if (programEvidence) return 'A styling or programming artefact governs its own target.';
    if (tc === 'CONTENTLESS_DEICTIC') return 'A metadata-only or unresolved referent supplies no target; the frozen REFUSE fallback applies.';
    return 'No controlling tax relation exists over the target; fall back to REFUSE.';
  }
  if (expected === 'CLARIFY') return 'A materially polysemous token with no controlling context must CLARIFY rather than resolve either way.';
  return 'Resolve through the primary task and governed target.';
}

/**
 * Expectation adjudication. A counterfactual expectation is flagged when it is not
 * structurally derivable from its own family rule. Flagged rows are preserved unchanged
 * and routed to a separate adjudication artifact; they are never silently edited.
 */
function adjudicate(r) {
  // A bare acronym pair expecting ALLOW without any tax context contradicts the frozen
  // acronym architecture, under which a materially polysemous bare token CLARIFIES.
  if (r.expected === 'ALLOW' && r.targetCompletenessType === 'AMBIGUOUS'
      && !TAX_PREDICATE.test(r.query) && !TAX_PROCEDURE.test(r.query)) {
    return { status: 'FLAGGED_POSSIBLE_SUITE_DEFECT', reason: 'expects ALLOW for a bare acronym with no tax predicate or procedure, which the frozen acronym architecture treats as materially ambiguous' };
  }
  // An expectation that requires a tax reading of a query whose only tax token sits
  // inside an explicitly ordinary domain contradicts the domain rule.
  if (r.expected === 'ALLOW' && r.ordinaryEvidence && !TAX_PREDICATE.test(r.query) && !TAX_PROCEDURE.test(r.query)) {
    return { status: 'FLAGGED_POSSIBLE_SUITE_DEFECT', reason: 'expects ALLOW where the only domain evidence is ordinary and no tax predicate or procedure governs the target' };
  }
  return { status: 'STRUCTURALLY_VALID', reason: 'expectation follows from the family rule and the governing architecture' };
}

const rows = cf.failures.map((f) => {
  const tc = targetCompleteness(f.query);
  const pt = primaryTask(f.query);
  const base = {
    suite: f.suite, family: f.family,
    queryHash: L.sha256(Buffer.from(f.query)).slice(0, 16),
    query: f.query, contrast: f.contrast,
    expected: f.expected, actual: f.actual,
    direction: `${f.expected}->${f.actual}`,
    primaryClause: f.query.split(/(?<=[.?!])\s+/)[0] || f.query,
    primaryTaskType: pt, targetCompletenessType: tc,
    taxDomainEvidence: TAX_PREDICATE.test(f.query) || TAX_PROCEDURE.test(f.query),
    taxPredicateEvidence: TAX_PREDICATE.test(f.query),
    taxProcedureEvidence: TAX_PROCEDURE.test(f.query),
    ordinaryEvidence: ORDINARY_DOMAIN.test(f.query),
    programEvidence: PROGRAM_DOMAIN.test(f.query),
    metadataSuffix: METADATA_SUFFIX.test(f.query),
    subordinateCodeClause: SUBORDINATE_CODE.test(f.query),
    namedStatute: NAMED_STATUTE.test(f.query),
    governingRelation: TAX_PREDICATE.test(f.query) ? 'tax_predicate_over_target'
      : (TAX_PROCEDURE.test(f.query) ? 'tax_procedure_over_object' : 'none_detected'),
    currentRuleThatFired: `${f.actual} via runtime precedence (see attempt trace)`,
    pairedRegressionControl: `${f.family}: the opposite side of the authored pair must hold after any correction`,
  };
  base.genericCorrection = correction(base);
  const adj = adjudicate(base);
  base.expectationStatus = adj.status;
  base.expectationAdjudicationReason = adj.reason;
  return base;
});

const tally = (k) => rows.reduce((a, r) => { a[r[k]] = (a[r[k]] || 0) + 1; return a; }, {});
const hashes = new Set(rows.map((r) => r.suite + ':' + r.queryHash));
const flagged = rows.filter((r) => r.expectationStatus !== 'STRUCTURALLY_VALID');

const contract = {
  unit: 'COMMIT 5R1-C11', generatedUtc: new Date().toISOString(),
  builtBeforeAnyRuntimeChange: true,
  counterfactualFailures: cf.failed, contractRows: rows.length,
  missing: cf.failed - rows.length,
  duplicates: rows.length - hashes.size,
  unresolvedExpectation: flagged.length,
  bySuite: tally('suite'), byFamily: tally('family'), byDirection: tally('direction'),
  byPrimaryTask: tally('primaryTaskType'), byTargetCompleteness: tally('targetCompletenessType'),
  expectationStatusCounts: tally('expectationStatus'),
  note: 'The counterfactual suite is not the frozen R3 oracle, but its expectations must still be structurally valid. Flagged rows are preserved unchanged and routed to a separate adjudication artifact; none were silently edited.',
  rows,
};
L.writeJson(L.RES + 'COMMIT_5R1C11_COUNTERFACTUAL_FAILURE_CONTRACT_58.json', contract);
L.writeJson(L.RES + 'COMMIT_5R1C11_COUNTERFACTUAL_EXPECTATION_ADJUDICATION.json', {
  unit: 'COMMIT 5R1-C11', generatedUtc: new Date().toISOString(),
  totalFailures: rows.length,
  structurallyValid: rows.length - flagged.length,
  flaggedPossibleSuiteDefect: flagged.length,
  originalExpectationsPreservedUnchanged: true,
  correctionApplied: false,
  policy: 'A counterfactual correction is permitted only for a demonstrated suite defect, only through a versioned correction artifact, and only when proven generic. No correction was applied in this pass; flagged rows remain as authored and are treated as genuine failures to be closed by runtime architecture.',
  flaggedRows: flagged.map((r) => ({ suite: r.suite, family: r.family, query: r.query, expected: r.expected, actual: r.actual, reason: r.expectationAdjudicationReason })),
});

console.log('contract rows =', rows.length, '| missing =', contract.missing, '| duplicates =', contract.duplicates);
console.log('bySuite    ', JSON.stringify(contract.bySuite));
console.log('byDirection', JSON.stringify(contract.byDirection));
console.log('byTask     ', JSON.stringify(contract.byPrimaryTask));
console.log('byTarget   ', JSON.stringify(contract.byTargetCompleteness));
console.log('expectationStatus', JSON.stringify(contract.expectationStatusCounts));
