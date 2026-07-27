// PHASE-10A14-R20 COMMIT 5R1-C23 - label-independent structural candidate rules.

export const RULES = {
  filipino_purchase_selection_is_non_tax_task: {
    principle: 'A Filipino "which item should be bought" question requests an ordinary purchase-selection action; absent tax predicates, the requested-action family controls.',
    assigns: 'explicit_non_tax_task',
    decision: 'REFUSE',
    syntacticSkeletons: [
      'alin ang <object> na bibilhin',
      'ano ang <object> na bibilhin',
      'aling <object> ang bibilhin',
    ],
    semanticFillerFamilies: ['equipment', 'service', 'digital asset'],
    match: (v) => v.reason === 'no_tax_relation'
      && v.decision === 'REFUSE'
      && v.taxPredicateScope === 'absent'
      && v.filipinoTaglishMorphology
      && /^(?:alin|ano|aling)\b/i.test(v.primary)
      && /\b(?:na\s+)?bibilhin\b/i.test(v.primary)
      && !v.hasTaxLexeme,
  },
  quoted_text_operation_is_quoted_term_only: {
    principle: 'A text operation over a quoted term manipulates the quoted words and does not request tax treatment of the term.',
    assigns: 'quoted_tax_term_only',
    decision: 'REFUSE',
    syntacticSkeletons: [
      'alphabetize the words "<term>"',
      'sort the words "<term>"',
      'reverse the phrase "<term>"',
    ],
    semanticFillerFamilies: ['tax term', 'ordinary term', 'document label'],
    match: (v) => v.reason === 'explicit_non_tax_task'
      && v.rel0 === 'QUOTES_TERM'
      && v.hasQuotedOperand
      && v.operationClass === 'text_transform',
  },
};

export const GENERALIZATION_PACKETS = {
  filipino_purchase_selection_is_non_tax_task: {
    positives: [
      'Alin ang printer cartridge na bibilhin?',
      'Ano ang office chair na bibilhin?',
      'Aling repair service ang bibilhin?',
      'Alin ang server upgrade na bibilhin?',
    ],
    lexicalSubstitutions: [
      'Alin ang camera lens na bibilhin?',
      'Ano ang catering package na bibilhin?',
      'Aling software license ang bibilhin?',
      'Alin ang warehouse shelf na bibilhin?',
    ],
    negativeNearMisses: [
      'Alin ang VAT return na ihahain?',
      'Alin ang withholding tax na babayaran?',
      'Ano ang tax treatment ng office chair?',
      'Alin ang invoice na gagamitin for input VAT?',
    ],
    grammaticalForms: ['interrogative alin/ano form', 'relative na bibilhin form'],
    semanticFillerFamilies: ['physical goods', 'services', 'software or digital assets'],
    copiedR3FullQueries: 0,
    copiedFrozenSuiteFullQueries: 0,
    numberingDependency: 0,
    distinctNormalizedSyntacticSkeletons: 3,
    leaveOneFillerFamilyOutExpected: 'PASS',
  },
  quoted_text_operation_is_quoted_term_only: {
    positives: [
      'Alphabetize the words "capital gains tax".',
      'Sort the words "inventory relief".',
      'Reverse the phrase "documentary stamp tax".',
      'Count the letters in "output VAT".',
    ],
    lexicalSubstitutions: [
      'Alphabetize the words "delivery receipt".',
      'Sort the phrase "project alpha".',
      'Reverse the words "lease contract".',
      'Count the letters in "withholding tax".',
    ],
    negativeNearMisses: [
      'What is capital gains tax?',
      'Is documentary stamp tax due on this deed?',
      'Explain output VAT for a retailer.',
      'Sort invoices by VAT amount.',
    ],
    grammaticalForms: ['imperative text operation', 'quoted operand command'],
    semanticFillerFamilies: ['tax terms', 'ordinary terms', 'document labels'],
    copiedR3FullQueries: 0,
    copiedFrozenSuiteFullQueries: 0,
    numberingDependency: 0,
    distinctNormalizedSyntacticSkeletons: 3,
    leaveOneFillerFamilyOutExpected: 'PASS',
  },
};

export function packetContractPass(packet) {
  return packet.positives.length >= 4
    && packet.lexicalSubstitutions.length >= 4
    && packet.negativeNearMisses.length >= 4
    && packet.grammaticalForms.length >= 2
    && packet.semanticFillerFamilies.length >= 3
    && packet.copiedR3FullQueries === 0
    && packet.copiedFrozenSuiteFullQueries === 0
    && packet.numberingDependency === 0
    && packet.distinctNormalizedSyntacticSkeletons >= 3;
}
