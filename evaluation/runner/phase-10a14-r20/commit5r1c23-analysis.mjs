// PHASE-10A14-R20 COMMIT 5R1-C23 - clean label-independent residual feature analysis.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as L from './commit5r1c20-lib.mjs';
import { GENERALIZATION_PACKETS, RULES, packetContractPass } from './commit5r1c23-candidates.mjs';

const RES = L.RES;
const SNAP_ATTEMPT = 'R20-domain_campaign-r20_commit5r1c20_reason_iteration_05-commit5r1c20-dev-05-ord01-2026-07-27T04-38-01-998Z';
const SNAP_ANALYZER = path.resolve(L.ATT, SNAP_ATTEMPT, 'runtime-snapshot/philippine-tax-intent-analyzer.js');
const ANALYZER_PATH = process.env.C23_ANALYZER_PATH || SNAP_ANALYZER;
const ANALYZER_LABEL = process.env.C23_ANALYZER_LABEL || SNAP_ATTEMPT;
const OUTPUT_PREFIX = process.env.C23_OUTPUT_PREFIX || 'COMMIT_5R1C23';
const EXPECTED_CONTAMINATED_PREFIX = /\b(?:no_tax_relation|explicit_non_tax_task|explicit_tax_task_relation|tax_treatment_of_ordinary_object|tax_compliance_task|tax_definition_with_context|non_tax_expansion|non_tax_label_or_name|quoted_tax_term_only)\|/;

function stripMetadata(q) {
  return String(q)
    .replace(/\s+(?:Control|Context)\s+\d+\.?$/i, '')
    .replace(/\s+TG\d+\.?$/i, '')
    .replace(/\s+Group\s+MM-\d+\.?$/i, '')
    .replace(/\s+variant\s+\d+\.?$/i, '')
    .trim();
}

function primaryText(ev, q) {
  const primary = (ev.clauses || []).find((c) => c.role === 'primary_task');
  return stripMetadata(primary ? primary.text : q).toLowerCase();
}

function operationClass(t) {
  if (/^(?:translate|summari[sz]e|explain|proofread)\b/i.test(t)) return 'language_transform';
  if (/^(?:alphabetize|sort|reverse|count|spell|format)\b/i.test(t)) return 'text_transform';
  if (/^(?:print|render|draw|paint|design|make|create|build|write|prepare|edit|update|configure|install|download|upload|move|copy|store|archive|attach)\b/i.test(t)) return 'artifact_operation';
  if (/\bbibilhin\b/i.test(t) || /^(?:buy|purchase)\b/i.test(t)) return 'purchase_selection';
  if (/^(?:file|register|remit|withhold|pay|protest|appeal)\b/i.test(t)) return 'tax_procedure_operation';
  return 'none';
}

function outcomeClass(t) {
  if (/\b(?:deadline|due date|when)\b/i.test(t)) return 'deadline';
  if (/\b(?:definition|meaning|means|what is|ano ang)\b/i.test(t)) return 'definition_or_meaning';
  if (/\b(?:deductible|vatable|taxable|subject to|withholding|customs duty|income tax|percentage tax)\b/i.test(t)) return 'tax_treatment';
  if (/\b(?:registration|filing|return|remittance|assessment|protest)\b/i.test(t)) return 'compliance';
  return 'none';
}

function headClass(t) {
  if (/^alin\b|^ano\b|^aling\b/i.test(t)) return 'filipino_selection_pronoun';
  if (/^what\b|^when\b|^how\b|^is\b|^are\b|^does\b|^do\b|^can\b|^should\b|^may\b/i.test(t)) return 'interrogative_or_auxiliary';
  if (/^(?:translate|print|alphabetize|sort|reverse|use|add|tune|make|create|write|prepare)\b/i.test(t)) return 'imperative_verb';
  if (/\b(?:report|letter|form|list|clause|discount|tier|subscription|booking|fee)\b/i.test(t)) return 'document_or_commercial_artifact';
  return 'nominal_or_other';
}

function featureVector(row, ev) {
  const t = primaryText(ev, row.query);
  const rels = (ev.relations || []).map((r) => r.relation);
  const hasTaxLexeme = /\b(?:tax|vat|bir|boc|withholding|deductib\w*|taxable|vatable|return|filing|assessment|estate|customs|duty|income)\b/i.test(t);
  const fields = {
    speechAct: ev.speechAct || 'unknown',
    clauseMood: /\?$/.test(t) ? 'question' : (/^(?:please\s+)?(?:translate|print|alphabetize|sort|reverse|use|add|make|create|write|prepare|buy|purchase)\b/i.test(t) ? 'imperative_or_directive' : 'fragment_or_assertion'),
    finiteVerb: /\b(?:is|are|was|were|has|have|do|does|can|could|should|would|may|will|must|means|applies|requires|bibilhin)\b/i.test(t),
    auxiliaryOrModal: (t.match(/\b(is|are|do|does|can|could|should|would|may|will|must)\b/i) || [null, 'none'])[1].toLowerCase(),
    requestMarker: /^(?:please|can|could|should|how|what|when|alin|ano|aling)\b/i.test(t),
    operationClass: operationClass(t),
    requestedOutcomeClass: outcomeClass(t),
    headClass: headClass(t),
    relationSet: rels.length ? [...new Set(rels)].sort().join('+') : '(none)',
    relationCount: rels.length,
    taxPredicateScope: hasTaxLexeme ? 'present' : 'absent',
    hasQuotedOperand: /"[^"]+"/.test(t),
    hasParentheticalOperand: /\([^)]+\)/.test(t),
    identifierComplement: /\b(?:as|under|to)\s+(?:the\s+|a\s+|an\s+)?(?:field|label|code|name|identifier|project code|product code)\b/i.test(t),
    documentProcedureInstrumentRole: /\b(?:form|return|filing|registration|assessment|protest|invoice|receipt|letter|report|clause|contract)\b/i.test(t),
    filipinoTaglishMorphology: /\b(?:ang|alin|aling|ano|ba|sa|ng|na|bibilhin|ireport|kita)\b/i.test(t),
    metadataOnlySuffix: stripMetadata(row.query) !== String(row.query).trim(),
    acronymReferentCompleteness: /\b[A-Z]{2,6}\b/.test(row.query) ? (/\b(?:means|stands for|ano ang|what is)\b/i.test(t) ? 'definition_intent' : 'bare_or_contextual') : 'none',
    targetSpecificity: /\b(?:this|that|the|my|our)\b/i.test(t) ? 'definite_or_deictic' : 'bare_or_indefinite',
  };
  return {
    fields,
    key: Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('|'),
    candidateView: {
      primary: t,
      rel0: rels[0] || '(none)',
      reason: ev.reasonCode,
      decision: ev.decision,
      taxPredicateScope: fields.taxPredicateScope,
      filipinoTaglishMorphology: fields.filipinoTaglishMorphology,
      hasTaxLexeme,
      hasQuotedOperand: fields.hasQuotedOperand,
      operationClass: fields.operationClass,
    },
  };
}

function add(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function summarizeGroups(groups) {
  const vectors = [];
  for (const [key, rows] of groups) {
    const expected = {};
    for (const r of rows) expected[r.expectedReason] = (expected[r.expectedReason] || 0) + 1;
    vectors.push({
      vector: key,
      support: rows.length,
      expectedReasonDistribution: expected,
      pure: Object.keys(expected).length === 1,
      counterexamples: rows.slice(0, 8).map((r) => ({
        oracleId: r.oracleId,
        expectedReason: r.expectedReason,
        actualReason: r.actualReason,
        query: r.query,
      })),
    });
  }
  vectors.sort((a, b) => b.support - a.support || a.vector.localeCompare(b.vector));
  return vectors;
}

function ablate(residual, featureNames) {
  return featureNames.map((name) => {
    const groups = new Map();
    for (const r of residual) {
      const fields = { ...r.featureFields };
      delete fields[name];
      const key = Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('|');
      add(groups, key, r);
    }
    const vectors = summarizeGroups(groups);
    return {
      removedFeature: name,
      vectorCount: vectors.length,
      collidingVectorCount: vectors.filter((v) => !v.pure).length,
      collidingRows: vectors.filter((v) => !v.pure).reduce((n, v) => n + v.support, 0),
    };
  });
}

const mod = await import(pathToFileURL(ANALYZER_PATH).href + '?v=' + Date.now());
const analyze = (q) => mod.analyzePhilippineTaxIntent(q);
const rows = L.loadR3();
const residual = [];
for (const row of rows) {
  const ev = analyze(row.query);
  if (ev.reasonCode === row.expectedReasonCodeFamily) continue;
  const fv = featureVector(row, ev);
  residual.push({
    oracleId: row.oracleId,
    query: row.query,
    expectedReason: row.expectedReasonCodeFamily,
    actualReason: ev.reasonCode,
    actualDecision: ev.decision,
    expectedDecision: row.expectedDecision,
    featureVector: fv.key,
    featureFields: fv.fields,
    candidateView: fv.candidateView,
  });
}

const groups = new Map();
for (const r of residual) add(groups, r.featureVector, r);
const vectors = summarizeGroups(groups);
const colliding = vectors.filter((v) => !v.pure);
const pure = vectors.filter((v) => v.pure);
const featureNames = Object.keys(residual[0]?.featureFields || {});
const oldLeaves = JSON.parse(fs.readFileSync(`${RES}COMMIT_5R1C21_RESIDUAL_STRUCTURAL_LEAVES.json`, 'utf8'));
const contaminatedVectors = (oldLeaves.leaves || []).filter((l) => EXPECTED_CONTAMINATED_PREFIX.test(l.vector || ''));

const simulations = {};
for (const [ruleName, rule] of Object.entries(RULES)) {
  const packet = GENERALIZATION_PACKETS[ruleName];
  const matched = residual.filter((r) => rule.match(r.candidateView));
  const allRowsEffect = [];
  let tp = 0, fpCorrect = 0, fpWrongDifferent = 0;
  for (const row of rows) {
    const ev = analyze(row.query);
    const fv = featureVector(row, ev);
    if (!rule.match(fv.candidateView)) continue;
    const wasCorrect = ev.reasonCode === row.expectedReasonCodeFamily;
    const becomesCorrect = rule.assigns === row.expectedReasonCodeFamily;
    if (!wasCorrect && becomesCorrect) tp++;
    else if (wasCorrect && !becomesCorrect) fpCorrect++;
    else if (!wasCorrect && !becomesCorrect && ev.reasonCode !== rule.assigns) fpWrongDifferent++;
    allRowsEffect.push({
      oracleId: row.oracleId,
      query: row.query,
      expectedReason: row.expectedReasonCodeFamily,
      beforeReason: ev.reasonCode,
      afterReason: rule.assigns,
      wasCorrect,
      becomesCorrect,
    });
  }
  simulations[ruleName] = {
    principle: rule.principle,
    assigns: rule.assigns,
    packetPass: packetContractPass(packet),
    matchedResidualRows: matched.length,
    matchedIds: matched.map((r) => r.oracleId),
    TP_CORRECTED: tp,
    FP_CORRECT_ROW_REGRESSION: fpCorrect,
    FP_WRONG_TO_DIFFERENT_WRONG: fpWrongDifferent,
    netDelta: tp - fpCorrect,
    admissibleForRuntime: tp > 0 && fpCorrect === 0 && fpWrongDifferent === 0 && packetContractPass(packet),
    effectRows: allRowsEffect,
  };
}

L.writeJson(`${RES}${OUTPUT_PREFIX}_C21_SEPARABILITY_CONTAMINATION_FINDING.json`, {
  unit: 'COMMIT 5R1-C23',
  generatedUtc: new Date().toISOString(),
  classification: 'EXPECTED_LABEL_FEATURE_CONTAMINATION',
  sourceFile: 'COMMIT_5R1C21_RESIDUAL_STRUCTURAL_LEAVES.json',
  contaminatedVectorCount: contaminatedVectors.length,
  examples: contaminatedVectors.slice(0, 5).map((x) => ({ vector: x.vector, count: x.count, ids: x.ids })),
  finding: 'C21 structural-leaf vectors serialized expectedReason and actualReason before runtime-observable fields; this made zero-collision separability tautological and non-controlling.',
  disposition: 'Preserve C21 evidence unchanged; use C23 label-independent vectors prospectively.',
});

fs.writeFileSync(`${RES}${OUTPUT_PREFIX}_LABEL_INDEPENDENT_FEATURE_SPEC.md`, `# COMMIT 5R1-C23 Label-Independent Feature Spec

Feature vectors exclude expected reason, expected decision, actual reason, oracle id,
row position, query hash, suite/family/category membership and full normalized query text.

Allowed inputs are query syntax and deterministic analyzer evidence available at runtime:
speech act, clause mood, finite verb, auxiliary/modal, request marker, requested operation
class, requested outcome class, subject/head class, relation set, relation count, tax
predicate scope, quoted or parenthetical operands, identifier complements, document or
procedure role, Filipino/Taglish morphology, metadata-only suffix presence, acronym
referent completeness and target definiteness.

The vector key is used only for analysis. It is not a runtime lookup table and is not
serialized into the analyzer.
`);

L.writeJson(`${RES}${OUTPUT_PREFIX}_LABEL_INDEPENDENT_SEPARABILITY_BASELINE.json`, {
  unit: 'COMMIT 5R1-C23',
  generatedUtc: new Date().toISOString(),
  baselineSource: ANALYZER_LABEL,
  residualRows: residual.length,
  vectorCount: vectors.length,
  pureVectorCount: pure.length,
  pureRows: pure.reduce((n, v) => n + v.support, 0),
  collidingVectorCount: colliding.length,
  collidingRows: colliding.reduce((n, v) => n + v.support, 0),
  method: 'Label-independent vector over runtime-observable syntax and analyzer evidence; expected labels appear only in distribution metadata.',
});

L.writeJson(`${RES}${OUTPUT_PREFIX}_RESIDUAL_FEATURE_MATRIX.json`, {
  unit: 'COMMIT 5R1-C23',
  generatedUtc: new Date().toISOString(),
  residualRows: residual.length,
  featureKeys: featureNames,
  rows: residual,
  vectors,
});

L.writeJson(`${RES}${OUTPUT_PREFIX}_COLLISION_ANALYSIS_V5.json`, {
  unit: 'COMMIT 5R1-C23',
  generatedUtc: new Date().toISOString(),
  residualRows: residual.length,
  vectorCount: vectors.length,
  separableRows: pure.reduce((n, v) => n + v.support, 0),
  collidingRows: colliding.reduce((n, v) => n + v.support, 0),
  collidingVectorCount: colliding.length,
  classification: colliding.length ? 'POSSIBLE_R3_REASON_LEARNABILITY_CONFLICT_CANDIDATES' : 'LABEL_INDEPENDENTLY_SEPARABLE',
  collidingVectors: colliding,
});

L.writeJson(`${RES}${OUTPUT_PREFIX}_FEATURE_ABLATION.json`, {
  unit: 'COMMIT 5R1-C23',
  generatedUtc: new Date().toISOString(),
  baseline: {
    featureCount: featureNames.length,
    vectorCount: vectors.length,
    collidingVectorCount: colliding.length,
    collidingRows: colliding.reduce((n, v) => n + v.support, 0),
  },
  ablations: ablate(residual, featureNames),
});

L.writeJson(`${RES}${OUTPUT_PREFIX}_RULE_GENERALIZATION_PACKETS.json`, {
  unit: 'COMMIT 5R1-C23',
  generatedUtc: new Date().toISOString(),
  packets: Object.fromEntries(Object.entries(GENERALIZATION_PACKETS).map(([name, packet]) => [name, {
    ...packet,
    packetPass: packetContractPass(packet),
    noSingleLiteralNounNecessary: true,
  }])),
});

L.writeJson(`${RES}${OUTPUT_PREFIX}_EFFECT_SIMULATION.json`, {
  unit: 'COMMIT 5R1-C23',
  generatedUtc: new Date().toISOString(),
  baselineSource: ANALYZER_LABEL,
  simulations,
  acceptedForMaterialIteration: Object.entries(simulations).filter(([, s]) => s.admissibleForRuntime).map(([name]) => name),
});

fs.writeFileSync(`${RES}${OUTPUT_PREFIX}_REASON_FEATURE_EXTRACTOR_SPEC.md`, `# COMMIT 5R1-C23 Reason Feature Extractor Spec

The C23 extractor is a compact structural layer over runtime-observable evidence. It
does not emit full normalized query text and does not consume expected labels, oracle
ids, query hashes, row positions, fixture membership or suite metadata.

Accepted feature families: requested concrete non-tax operation, ordinary assertion or
topic with no requested operation, local expansion or equative definition, identifier
assignment or naming, quoted-text operation, tax compliance outcome, tax definition
outcome, tax rule or instrument as requested subject, external transaction/item as
tax-treatment bearer, unresolved acronym or incomplete referent.
`);

fs.writeFileSync(`${RES}${OUTPUT_PREFIX}_REASON_DECISION_TABLE.md`, `# COMMIT 5R1-C23 Reason Decision Table

| Precedence | Structural predicate | Reason |
|---:|---|---|
| 1 | Text operation over a quoted operand, with no request to apply tax law | quoted_tax_term_only |
| 2 | Requested concrete non-tax operation on an external object | explicit_non_tax_task |
| 3 | Ordinary assertion/topic with no requested operation and no tax relation | no_tax_relation |
| 4 | Local expansion or equative definition to a non-tax meaning | non_tax_expansion |
| 5 | Identifier assignment, internal label or naming complement | non_tax_label_or_name |
| 6 | Tax compliance outcome such as filing, registration, remittance or protest deadline | tax_compliance_task |
| 7 | Tax definition outcome in controlling tax context | tax_definition_with_context |
| 8 | Tax rule, instrument or procedure as the requested subject | explicit_tax_task_relation |
| 9 | External transaction or item as tax-treatment bearer | tax_treatment_of_ordinary_object |
| 10 | Unresolved acronym or incomplete referent with plausible tax sense | ambiguous_tax_acronym |

Rows are structural only. No row may mention oracle ids, fixture nouns, query hashes,
scenario numbers, expected labels or source-set membership.
`);

console.log(`C23 analysis complete: residual=${residual.length} vectors=${vectors.length} colliding=${colliding.reduce((n, v) => n + v.support, 0)}`);
console.log(JSON.stringify(Object.fromEntries(Object.entries(simulations).map(([k, v]) => [k, { tp: v.TP_CORRECTED, fp: v.FP_CORRECT_ROW_REGRESSION, wrong: v.FP_WRONG_TO_DIFFERENT_WRONG, net: v.netDelta, admissible: v.admissibleForRuntime }]))));
