// PHASE-10A14-R20 COMMIT 5R1-C11 — iteration 03 structural corrections.
//
// (1) The widened tax vocabulary made metadata-suffixed contentless queries match, so
//     "Is it subject to VAT? Situation 8." now builds a relation. The contentless guard
//     must run on the metadata-stripped clause: an enumerated suffix never supplies a
//     target, whatever tax predicate precedes it.
// (2) A governed tax predicate whose subject is a concrete noun phrase ("the interest
//     income", "the insurance premium") must build a treatment relation. The existing
//     hasAnchor test misses a plain definite-NP subject.
// (3) A naming/titling action over a token is label binding even when the token is a
//     statute name; and a statute inside a genuine tax question is subject matter.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;

// ── (1) contentless guard evaluated on the metadata-stripped clause
const evAnchor = '  const conciseTaxPhrase = CONCISE_TAX_PHRASE_RE.test(fullLo);';
if (!s.includes(evAnchor)) throw new Error('evidence anchor missing');
s = s.replace(evAnchor, evAnchor + '\n'
  + '  // An enumerated metadata suffix never supplies a target. When the clause that\n'
  + '  // remains after stripping it has only a deictic subject, the referent is\n'
  + '  // contentless no matter which tax predicate is present.\n'
  + '  const strippedOfMetadata = normalizedText.replace(METADATA_SUFFIX_RE, "").trim();\n'
  + '  const metadataOnlyContentlessTarget = METADATA_SUFFIX_RE.test(fullLo)\n'
  + '    && /^(?:is|are|does|do|can|should|when|what|which|how|will|where)\\b[^?]*\\b(?:it|this|that|they|the)\\b[^?]*\\??$/i.test(strippedOfMetadata)\n'
  + '    && !CONCRETE_ANTECEDENT_NOUN_RE.test(strippedOfMetadata)\n'
  + '    && !/\\b(?:bought|purchased|acquired|paid|received|sold|leased|imported|hired|engaged|rented)\\b/i.test(fullLo);');

const objAnchor = 'orderingActionOverOrdinaryPopulation, contractQuestionAboutTaxClause, bareTaxabilityQuestion, barePolysemousAcronym, acronymInTaxProcedureQuestion };';
if (!s.includes(objAnchor)) throw new Error('evidence object anchor missing');
s = s.replace(objAnchor, 'orderingActionOverOrdinaryPopulation, contractQuestionAboutTaxClause, bareTaxabilityQuestion, barePolysemousAcronym, acronymInTaxProcedureQuestion, metadataOnlyContentlessTarget };');

// decision rule: place it with the other contentless guards, before tax-relation rules
const decAnchor = '  // 0c-quater. An ordering or listing action over an ordinary population governs its';
if (!s.includes(decAnchor)) throw new Error('decision anchor missing');
s = s.replace(decAnchor,
  '  // 0c-quinquies. A metadata-only contentless target supplies no subject, so the\n'
  + '  // frozen REFUSE fallback applies regardless of the tax predicate present.\n'
  + '  if (evidence.metadataOnlyContentlessTarget) {\n'
  + "    return decide('REFUSE', 'no_tax_relation', 0.60);\n"
  + '  }\n'
  + decAnchor);

// ── (2) definite noun-phrase subject counts as an anchor for a treatment predicate
const anchorLine = s.match(/ {2}const hasAnchor = [\s\S]*?;\n/);
if (!anchorLine) throw new Error('hasAnchor missing');
s = s.replace(anchorLine[0],
  anchorLine[0].replace(/;\n$/, '\n')
  + '    || (/^(?:is|are|was|were|how much|what)\\b[^?]*\\b(?:the|a|an)\\s+[a-z][a-z\\- ]{2,40}\\b/i.test(lo)\n'
  + '        && !hasNonTaxDomainNounIn(lo));\n');

// ── (3) naming/titling over any token, including a statute name, is label binding
const nameAnchor = '  const namingActionAnyClause =';
if (!s.includes(nameAnchor)) throw new Error('naming anchor missing');
const nameLine = s.match(/ {2}const namingActionAnyClause = [\s\S]*?;\n/);
s = s.replace(nameLine[0],
  '  const namingActionAnyClause = /\\b(?:name|rename|label|tag|title|call|store|save)\\s+(?:the\\s+|this\\s+|our\\s+|an?\\s+)?(?:folder|file|sheet|tab|column|field|document|record|deck|invite|project|template|archive|drive|manifest|checklist|booking|shipping)\\b/i.test(fullLo)\n'
  + '    || /\\b(?:title|name|label|tag)\\s+the\\s+[a-z ]{2,30}\\s+[A-Z]{2,6}\\b/.test(normalizedText);\n');

fs.writeFileSync(p, s);
console.log('patched: +' + (s.length - before) + ' bytes');
