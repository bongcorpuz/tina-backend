// PHASE-10A14-R20 COMMIT 5R1-C17 — §7 feature-acquisition audit and §8 learnability
// stop condition.
//
// Recomputes all 535 residual rows under the C16 feature set, then adds ENRICHED
// runtime-observable features (question/request/assertion subtype, predicate attachment
// and argument structure, action head class, requested outcome class, target syntactic
// and semantic role, topic completeness, ambiguity object, discourse attachment) and
// measures how much of the C16 collision each one removes.
//
// Deterministic parsing only. No external model, no new dependency, no oracle metadata.
import fs from 'node:fs';
import * as L from './commit5r1c17-lib.mjs';

const rows = L.loadR3();
const analyze = await L.loadAnalyzer();

// ============================================================ C16 baseline features
const c16Features = (ev, ptLo) => {
  const rels = (ev.relations || []).map((x) => x.relation);
  const interrog = /^(?:what|which|who|whom|whose|when|where|why|how|is|are|was|were|do|does|did|can|could|should|would|may|might|will|shall|has|have|had|ano|alin|sino|paano|kailan|saan|bakit|may|magkano|kailangan)\b/i.test(ptLo);
  const imper = /^(?:please\s+)?(?:change|rename|delete|draw|paint|compile|install|download|sort|cook|play|sing|design|render|print|debug|prepare|improve|buy|organi[sz]e|fix|build|write|update|configure|adjust|schedule|edit|make|create|summari[sz]e|list|translate|explain|tune|format|archive|count|repeat|spell|reverse|proofread|ayusin|linisin|palitan|ilagay|bilhin|gawin|isulat|tanggalin|ihanda|i-[a-z]+)\b/i.test(ptLo);
  return {
    speechAct: imper ? 'request' : interrog ? 'question' : /\?/.test(ptLo) ? 'question_marked_assertion' : 'assertion',
    predicateClass: /\bdeductib\w*\b/i.test(ptLo) ? 'deductibility'
      : /\bvat\b|value[- ]added/i.test(ptLo) ? 'vat'
      : /\bwithhold\w*/i.test(ptLo) ? 'withholding'
      : /\bcustoms|tariff|dutiable/i.test(ptLo) ? 'customs'
      : /\btaxab\w*|subject to tax/i.test(ptLo) ? 'taxability'
      : /\b(?:bir form|filing|file|register\w*|registration|remit\w*|deadline|due date|penalty|alphalist|slsp|tax clearance|books of account|substantiat\w*|return)\b/i.test(ptLo) ? 'procedure'
      : /\b(?:income tax|value[- ]added tax|withholding tax|percentage tax|excise tax|documentary stamp|capital gains tax|estate tax|donor'?s? tax|customs dut\w*|final tax|nolco|mcit|rcit|iaet|cgt|cwt|ewt|fwt|dst|fbt|osd)\b/i.test(ptLo) ? 'tax_concept' : 'none',
    controllingRelation: rels.length ? rels[0] : '(none)',
    unresolvedKind: (ev.ambiguityFlags || []).includes('ambiguous_acronym') ? 'acronym'
      : (ev.ambiguityFlags || []).includes('dangling_referent') ? 'referent' : 'none',
  };
};

// ============================================================ enriched features (C17)
const ENRICHED = {
  // --- question subtype -------------------------------------------------------
  questionOperator: (t) => {
    if (/^(?:is|are|was|were|do|does|did|can|could|should|would|may|might|will|shall|has|have|had|may|kailangan)\b/i.test(t)) return 'yes_no';
    if (/^what\b/i.test(t)) return 'wh_what';
    if (/^how\b/i.test(t)) return 'wh_how';
    if (/^which\b/i.test(t)) return 'wh_which';
    if (/^(?:when|kailan)\b/i.test(t)) return 'wh_when';
    if (/^(?:where|saan)\b/i.test(t)) return 'wh_where';
    if (/^(?:why|bakit)\b/i.test(t)) return 'wh_why';
    if (/^(?:ano|alin|sino|paano|magkano)\b/i.test(t)) return 'wh_filipino';
    return 'none';
  },
  // --- request subtype --------------------------------------------------------
  requestOperationClass: (t) => {
    if (/^(?:please\s+)?(?:translate|summari[sz]e|reformat|format|convert|rewrite|rephrase)\b/i.test(t)) return 'transformation';
    if (/^(?:please\s+)?(?:list|show|find|retrieve|get|fetch|search)\b/i.test(t)) return 'retrieval';
    if (/^(?:please\s+)?(?:explain|describe|clarify|interpret|detail)\b/i.test(t)) return 'explanation';
    if (/\b(?:is best|are best|recommend|suggest|should i (?:buy|use|pick|choose)|magandang bilhin)\b/i.test(t)) return 'evaluation';
    if (/^(?:please\s+)?(?:draw|paint|design|compose|write|create|make|build|render)\b/i.test(t)) return 'creative';
    if (/^(?:please\s+)?(?:rename|relabel|call it|name it)\b/i.test(t)) return 'naming';
    if (/^(?:please\s+)?(?:change|delete|sort|move|copy|install|download|debug|compile|update|configure|adjust|schedule|edit|print|archive|tune|fix|improve|prepare|organi[sz]e|buy|play|cook|sing|ayusin|linisin|palitan|ilagay|bilhin|gawin|isulat|tanggalin|ihanda|i-[a-z]+)\b/i.test(t)) return 'direct_imperative';
    return 'none';
  },
  // --- assertion subtype ------------------------------------------------------
  assertionClass: (t) => {
    if (/\b(?:is (?:only |just )?(?:an?|our) (?:internal )?(?:label|name|code|codename)|code-?named|is called)\b/i.test(t)) return 'naming_assertion';
    if (/\bstands for\b|\bi\.e\.\b|\s=\s|\bwe use\b.*\bfor\b|\bmeans\b/i.test(t)) return 'equational';
    if (/\blang ang\b|\blang ba\b|\bnamin\b/i.test(t)) return 'local_redefinition';
    if (/\b(?:not|hindi|never|no longer)\b/i.test(t)) return 'denial';
    if (/^[a-z0-9 \-()]+$/i.test(t.replace(/[.?!]/g, '')) && t.trim().split(/\s+/).length <= 6) return 'topic_fragment';
    return 'descriptive';
  },
  // --- predicate attachment: what does the tax predicate attach TO? -----------
  predicateAttachment: (t) => {
    if (!/\b(?:taxab\w*|deductib\w*|vat|withhold\w*|customs|excise|dutiable|subject to)\b/i.test(t)) return 'no_tax_predicate';
    // "Is the <X> subject to ...": predicate attaches to the SUBJECT noun phrase.
    if (/^(?:is|are|was|were|may|ang)\b[^?]*\b(?:subject to|taxab\w*|deductib\w*|vatable|dutiable)\b/i.test(t)) return 'subject';
    // "... tax on <X>", "... apply to <X>": predicate attaches to an OBJECT complement.
    if (/\b(?:tax|vat|withholding|dut(?:y|ies))\b[^?]*\b(?:on|to|for|sa)\b\s+\S+/i.test(t)) return 'object_complement';
    // "How is <tax concept> computed/disclosed/documented": the concept IS the subject.
    if (/\b(?:comput\w*|disclos\w*|document\w*|report\w*|treat\w*)\b/i.test(t)) return 'proposition';
    return 'other';
  },
  predicateArgumentStructure: (t) => {
    if (/^(?:is|are|was|were|ang|may)\b/i.test(t) && /\b(?:subject to|taxab\w*|deductib\w*|vatable|dutiable|exempt)\b/i.test(t)) return 'copular';
    if (/^(?:does|do|did|can|could|should|will)\b[^?]*\b(?:apply|attach|arise)\b/i.test(t)) return 'transitive_action';
    if (/\b(?:how|paano)\b[^?]*\b(?:comput\w*|treat\w*|report\w*|disclos\w*|document\w*)\b/i.test(t)) return 'process';
    return 'other';
  },
  // --- requested outcome ------------------------------------------------------
  requestedOutcomeClass: (t) => {
    if (/\b(?:what|which)\s+(?:bir\s+)?form\b|\bform applies\b|\bform should\b/i.test(t)) return 'form_selection';
    if (/\b(?:deadline|due date|when is|kailan)\b/i.test(t)) return 'deadline';
    if (/\bpenalt\w*\b/i.test(t)) return 'penalty';
    if (/\bsubject to (?:bir )?registration\b|\bregister\w*\b/i.test(t)) return 'registration';
    if (/\bremit\w*\b/i.test(t)) return 'remittance';
    if (/\b(?:file|filing|pag-?file)\b/i.test(t)) return 'filing';
    if (/\b(?:records support|what records|substantiat\w*|proof|evidence)\b/i.test(t)) return 'evidentiary';
    if (/\b(?:mean|means|meaning|refer to|stand for|define|definition)\b/i.test(t)) return 'definition';
    if (/\b(?:comput\w*|magkano|how much)\b/i.test(t)) return 'computation';
    if (/\b(?:subject to|taxab\w*|deductib\w*|vatable|dutiable|exempt|treatment)\b/i.test(t)) return 'status_treatment';
    if (/^(?:please\s+)?(?:translate|summari[sz]e|format|convert|rewrite)\b/i.test(t)) return 'transformation';
    if (/^(?:please\s+)?(?:rename|relabel|name|call)\b/i.test(t)) return 'naming';
    if (/\b(?:explain|describe|clarify|interpret)\b/i.test(t)) return 'explanation';
    return 'none';
  },
  // --- target roles -----------------------------------------------------------
  targetSemanticRole: (t) => {
    const TAXCONCEPT = /\b(?:income tax|value[- ]added tax|withholding tax|percentage tax|excise tax|documentary stamp|capital gains tax|estate tax|donor'?s? tax|customs dut\w*|final tax|tax amnesty|deficiency interest|tax credit|tax refund|net operating loss|minimum corporate income tax|regular corporate income tax|optional standard deduction|nolco|mcit|rcit|iaet|cgt|cwt|ewt|fwt|dst|fbt|osd|input vat|output vat)\b/i;
    const TRANSACTION = /\b(?:transaction|purchase|sale|sales|payment|import|imports|expense|lease|rental|contract|billing|remuneration|compensation|commission|royalt\w*|dividend)\b/i;
    const RECEIPT = /\b(?:receipts?|income|revenue from|proceeds|earnings|kita)\b/i;
    const SERVICE = /\b(?:service|services|fee|fees|professional fee)\b/i;
    const ASSET = /\b(?:asset|property|land|building|equipment|vehicle|goods|suppl(?:y|ies))\b/i;
    const PROCEDURE = /\b(?:bir form|filing|registration|remittance|deadline|penalty|alphalist|slsp|books of account|tax clearance)\b/i;
    const ARTEFACT = /\b(?:folder|file|document|handbook|manual|brochure|poster|slide|deck|spreadsheet|column|font|typeface|css|typescript|javascript|enum|variable|code|class list|web form)\b/i;
    if (PROCEDURE.test(t)) return 'procedure';
    if (TAXCONCEPT.test(t) && !TRANSACTION.test(t) && !RECEIPT.test(t) && !SERVICE.test(t) && !ASSET.test(t)) return 'tax_concept';
    if (TRANSACTION.test(t)) return 'transaction';
    if (RECEIPT.test(t)) return 'receipt_income';
    if (SERVICE.test(t)) return 'service';
    if (ASSET.test(t)) return 'asset';
    if (ARTEFACT.test(t)) return 'artefact';
    return 'other';
  },
  targetSyntacticRole: (t) => {
    if (/^(?:is|are|was|were|ang|may)\s+(?:the|a|an|this|that)?\s*\S+/i.test(t)) return 'subject';
    if (/\b(?:on|to|for|sa|of|from)\s+(?:the|a|an)?\s*\S+/i.test(t)) return 'prepositional_object';
    if (/^(?:please\s+)?[a-z-]+\s+(?:the|a|an|this|that|ang|ng|mga)\s+\S+/i.test(t)) return 'direct_object';
    return 'none';
  },
  // --- topic completeness -----------------------------------------------------
  topicCompleteness: (t) => {
    if (/\b(?:it|this|that|these|those|ito|iyan)\b\s*(?:\?|$)/i.test(t)) return 'unresolved_referent';
    if (/^\s*[a-z]{2,6}\s*\??\s*$/i.test(t)) return 'acronym_itself';
    if (/\bwhat about\b/i.test(t)) return 'bare_topic';
    if (/^(?:the|a|an|this|that|ang|ito)\b/i.test(t)) return 'definite_target';
    if (t.trim().split(/\s+/).length <= 5 && !/\?/.test(t)) return 'topic_fragment';
    return 'indefinite_target';
  },
  // --- ambiguity object -------------------------------------------------------
  ambiguityObject: (t, ev) => {
    if ((ev.ambiguityFlags || []).includes('ambiguous_acronym')) return 'acronym';
    if (/\bwhat about\b/i.test(t)) return 'topic';
    if ((ev.ambiguityFlags || []).includes('dangling_referent')) return 'referent';
    return 'none';
  },
  // --- discourse attachment ---------------------------------------------------
  contextAttachment: (ev, primary) => {
    const cs = ev.clauses || [];
    if (cs.length <= 1) return 'primary_only';
    if (cs[0] && cs[0].clauseId !== (primary && primary.clauseId)) {
      if (/^(?:although|even though|though|while|kahit|bagaman)\b/i.test(String(cs[0].text).trim())) return 'concessive_context';
      return 'subordinate_context';
    }
    return 'multi_clause_primary_first';
  },
};

const enrichedOf = (q) => {
  const ev = analyze(q);
  const primary = (ev.clauses || []).find((c) => c.role === 'primary_task');
  const pt = String(primary ? primary.text : q).trim();
  const t = pt.toLowerCase();
  const base = c16Features(ev, t);
  return {
    ...base,
    questionOperator: ENRICHED.questionOperator(t),
    requestOperationClass: ENRICHED.requestOperationClass(t),
    assertionClass: ENRICHED.assertionClass(t),
    predicateAttachment: ENRICHED.predicateAttachment(t),
    predicateArgumentStructure: ENRICHED.predicateArgumentStructure(t),
    requestedOutcomeClass: ENRICHED.requestedOutcomeClass(t),
    targetSemanticRole: ENRICHED.targetSemanticRole(t),
    targetSyntacticRole: ENRICHED.targetSyntacticRole(t),
    topicCompleteness: ENRICHED.topicCompleteness(t),
    ambiguityObject: ENRICHED.ambiguityObject(t, ev),
    contextAttachment: ENRICHED.contextAttachment(ev, primary),
    actualReason: ev.reasonCode,
  };
};

// ============================================================ residual + collisions
const residual = [];
for (const r of rows) {
  const ev = analyze(r.query);
  if (ev.reasonCode === r.expectedReasonCodeFamily) continue;
  residual.push({ row: r, f: enrichedOf(r.query) });
}

const C16_KEYS = ['speechAct', 'predicateClass', 'controllingRelation', 'unresolvedKind'];
const ENRICHED_KEYS = [...C16_KEYS, 'questionOperator', 'requestOperationClass', 'assertionClass',
  'predicateAttachment', 'predicateArgumentStructure', 'requestedOutcomeClass',
  'targetSemanticRole', 'targetSyntacticRole', 'topicCompleteness', 'ambiguityObject', 'contextAttachment'];

const group = (keys) => {
  const g = {};
  for (const { row, f } of residual) {
    const k = keys.map((x) => `${x}=${f[x]}`).join('|');
    g[k] ??= { count: 0, expected: {}, actual: {}, examples: [] };
    g[k].count++;
    g[k].expected[row.expectedReasonCodeFamily] = (g[k].expected[row.expectedReasonCodeFamily] || 0) + 1;
    g[k].actual[f.actualReason] = (g[k].actual[f.actualReason] || 0) + 1;
    if (g[k].examples.length < 4) g[k].examples.push({ oracleId: row.oracleId, expected: row.expectedReasonCodeFamily });
  }
  const vectors = Object.entries(g).map(([k, v]) => ({
    vector: k, count: v.count,
    distinctExpected: Object.keys(v.expected).length,
    separable: Object.keys(v.expected).length === 1,
    expected: v.expected, actual: v.actual, examples: v.examples,
  })).sort((a, b) => b.count - a.count);
  return {
    vectors,
    separableRows: vectors.filter((v) => v.separable).reduce((n, v) => n + v.count, 0),
    collidingRows: vectors.filter((v) => !v.separable).reduce((n, v) => n + v.count, 0),
  };
};

const c16 = group(C16_KEYS);
const enriched = group(ENRICHED_KEYS);

// Per-feature collision reduction: add ONE enriched feature to the C16 set at a time.
const perFeature = [];
for (const k of ENRICHED_KEYS.filter((x) => !C16_KEYS.includes(x))) {
  const g = group([...C16_KEYS, k]);
  perFeature.push({
    feature: k,
    collidingRowsAfter: g.collidingRows,
    collisionReduction: c16.collidingRows - g.collidingRows,
    separableRowsAfter: g.separableRows,
    vectorCount: g.vectors.length,
  });
}
perFeature.sort((a, b) => b.collisionReduction - a.collisionReduction);

L.writeJson(L.RES + 'COMMIT_5R1C17_REASON_OBSERVABILITY_AUDIT.json', {
  unit: 'COMMIT 5R1-C17', generatedUtc: new Date().toISOString(),
  method: 'All residual rows are described using deterministic runtime-observable features derived from the primary clause and the locked relation output. No oracle metadata, expected reason, source set, query id or template identity is used as a feature.',
  residualRows: residual.length,
  c16FeatureKeys: C16_KEYS,
  enrichedFeatureKeys: ENRICHED_KEYS,
  c16Baseline: { vectors: c16.vectors.length, separableRows: c16.separableRows, collidingRows: c16.collidingRows },
  enrichedResult: { vectors: enriched.vectors.length, separableRows: enriched.separableRows, collidingRows: enriched.collidingRows },
  collisionReductionTotal: c16.collidingRows - enriched.collidingRows,
  perFeatureCollisionReduction: perFeature,
  allResidualRowsRepresented: residual.length === 535,
  noOracleOnlyFeature: true, noExactTemplateFeature: true,
});

L.writeJson(L.RES + 'COMMIT_5R1C17_COLLISION_GROUP_ANALYSIS.json', {
  unit: 'COMMIT 5R1-C17', generatedUtc: new Date().toISOString(),
  c16CollidingVectors: c16.vectors.filter((v) => !v.separable),
  enrichedCollidingVectors: enriched.vectors.filter((v) => !v.separable),
  enrichedSeparableVectorsTop: enriched.vectors.filter((v) => v.separable).slice(0, 40),
  oracleIdsAreAnalysisEvidenceOnly: true,
});

L.writeJson(L.RES + 'COMMIT_5R1C17_ENRICHED_SEPARABILITY_BASELINE.json', {
  unit: 'COMMIT 5R1-C17', generatedUtc: new Date().toISOString(),
  residualRows: residual.length,
  underC16Features: { separable: c16.separableRows, colliding: c16.collidingRows },
  underEnrichedFeatures: { separable: enriched.separableRows, colliding: enriched.collidingRows },
  reachableCeiling: enriched.separableRows,
  irreducibleUnderDeterministicParsing: enriched.collidingRows,
});

console.log('residual rows            =', residual.length);
console.log('C16      vectors/sep/coll =', c16.vectors.length, '/', c16.separableRows, '/', c16.collidingRows);
console.log('ENRICHED vectors/sep/coll =', enriched.vectors.length, '/', enriched.separableRows, '/', enriched.collidingRows);
console.log('collision reduction       =', c16.collidingRows - enriched.collidingRows);
console.log('\nper-feature collision reduction (added singly to the C16 set):');
for (const f of perFeature) console.log(`  ${f.feature.padEnd(28)} colliding ${String(f.collidingRowsAfter).padStart(3)}  reduction ${String(f.collisionReduction).padStart(3)}`);
console.log('\nlargest ENRICHED separable vectors:');
for (const v of enriched.vectors.filter((v) => v.separable).slice(0, 14)) {
  console.log(`  n=${String(v.count).padStart(3)} -> ${Object.keys(v.expected)[0]}   (actual ${Object.keys(v.actual).join(',')})`);
  console.log(`        ${v.vector}`);
}
console.log('\nremaining ENRICHED collisions:');
for (const v of enriched.vectors.filter((v) => !v.separable).slice(0, 10)) {
  console.log(`  n=${String(v.count).padStart(3)}  expected=${JSON.stringify(v.expected)}`);
  console.log(`        ${v.vector}`);
}
