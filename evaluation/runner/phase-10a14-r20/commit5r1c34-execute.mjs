// PHASE-10A14-R20 COMMIT 5R1-C34
// Crash recovery, exact C33 M01R reconstruction, and bounded cumulative reason work.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as L from './commit5r1c20-lib.mjs';
import * as C from './commit5r1c34-lib.mjs';

const RECOVERY_SNAPSHOT = 'C:/Temp/tina-c34-crash-recovery-20260728T075732836Z';
const RECOVERY_CHECKPOINT = path.join(C.RES, 'COMMIT_5R1C34_RECOVERY_CHECKPOINT.json');
const RECOVERY_CHECKPOINT_LOG = path.join(C.RES, 'COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson');
const ACCOUNT_TRANSFER_CONTINUITY = path.join(
  C.RES,
  'COMMIT_5R1C34_CODEX_ACCOUNT_TRANSFER_CONTINUITY.json',
);
const PREALLOCATION_VALIDATION = path.join(
  C.RES,
  'COMMIT_5R1C34_ACCOUNT_TRANSFER_PREALLOCATION_VALIDATION.json',
);
const TECHNICAL_RECOVERY_ADJUDICATION = path.join(
  C.RES,
  'COMMIT_5R1C34_TECHNICAL_RECOVERY_FORENSIC_ADJUDICATION.json',
);
const TECHNICAL_RECOVERY_PREALLOCATION = path.join(
  C.RES,
  'COMMIT_5R1C34_TECHNICAL_RECOVERY_PREALLOCATION_VALIDATION.json',
);
const TECHNICAL_RECOVERY_SNAPSHOT =
  'C:/Temp/tina-c34-technical-recovery-20260728T134942137Z';
const FULL_HEAD_PATCH_BLOCKER_FREEZE =
  'C:/Temp/tina-c34-full-head-patch-blocker-20260728T234300515Z';
const TIMEBOX_CONTINUATION_SNAPSHOT =
  'C:/tmp/tina-c34-timebox-continuation-20260729T043326Z';
const TIMEBOX_STARTED_UTC = '2026-07-29T04:33:26.069Z';
const TIMEBOX_HARD_STOP_UTC = '2026-07-29T05:33:26.069Z';
const TIMEBOX_RETRY_LATEST_START_UTC = '2026-07-29T05:13:26.069Z';
const TIMEBOX_COMPATIBILITY_VALIDATION = path.join(
  C.RES,
  'COMMIT_5R1C34_LINKED_RETRY_SUPERSEDING_COMPATIBILITY_VALIDATION.json',
);
const TIMEBOX_NO_ALLOCATION_PREFLIGHT = path.join(
  C.RES,
  'COMMIT_5R1C34_LINKED_RETRY_NO_ALLOCATION_PREFLIGHT.json',
);
const TIMEBOX_LATE_ALLOCATION_GATE = path.join(
  C.RES,
  'COMMIT_5R1C34_LINKED_RETRY_LATE_ALLOCATION_GATE.json',
);
const TIMEBOX_SAFE_PAUSE = path.join(
  C.RES,
  'COMMIT_5R1C34_ONE_HOUR_SAFE_PAUSE.json',
);
const TIMEBOX_SAFE_PAUSE_MANIFEST = path.join(
  C.RES,
  'COMMIT_5R1C34_ONE_HOUR_SAFE_PAUSE_EVIDENCE.sha256',
);
const CHECKPOINT_27_SAFE_PAUSE = path.join(
  C.RES,
  'COMMIT_5R1C34_LINKED_RETRY_PREALLOCATION_SAFE_PAUSE.json',
);
const CHECKPOINT_27_SAFE_PAUSE_MANIFEST = path.join(
  C.RES,
  'COMMIT_5R1C34_LINKED_RETRY_PREALLOCATION_SAFE_PAUSE_EVIDENCE.sha256',
);
const TIMEBOX_CHECKPOINT_HASHES = Object.freeze({
  25: 'ab66ded8a0d5bc8aea3cefd071dbcb91b8f646431b919a5d2bcba6fd036bb3ba',
  26: 'bb5fdbaa97ee649f3f07266f1aca38f7101ba31c2c7abe213855b6f038fb4a01',
  27: 'b9baad762a5c515ee3efcfb6c244a98dee729341a5a8611bd9432bc2945eb849',
});
const TIMEBOX_PREVIOUS_RUNNER_SHA256 =
  'cb22cadc8183a3fe7d7b1f74f8fad5b327d40e2d524c709c1a0b9ce1c8f9c699';
const TIMEBOX_LIB_SHA256 =
  'dd3bd236eee0dd515146ac20314b3678b87cbca4d907e0225fdeec8a16431298';
const ORIGINAL_NT01_ATTEMPT =
  'R20-domain_campaign-commit5r1c34-nt01-ord01-2026-07-28T13-34-41-962Z';
const RECONSTRUCTION_ATTEMPT =
  'R20-domain_campaign-commit5r1c34-reconstruct-ord01-2026-07-28T13-34-33-514Z';
const TECHNICAL_RECOVERY_SNAPSHOT_INVENTORY_SHA256 =
  '9db310a147562cbae7e60c5d03fbbc661c43c81f590cf1f1fc274729283085de';
const TECHNICAL_RECOVERY_SNAPSHOT_METADATA_SHA256 =
  '896d1a4f62e6f8a7494aa7e4162f9d3d64024472955c5486f3296f73c87d3441';
const FAILED_RUN_EXECUTE_SHA256 =
  '86ba07a5825ddec587e99ac5fe6946bd9dd08caff78c56221c317b4def3f422a';
const FAILED_RUN_LIB_SHA256 =
  '51f7b9b5552fc8fb46b237de0a77d158e00d15c6316d523161ae268086d479b6';
const EXPECTED_BRANCH = 'feature/source-availability-engine-v1';
const TECHNICAL_RECOVERY_PREREQUISITE_ARTIFACTS = Object.freeze([
  'PREFLIGHT.json',
  'MANDATORY_FIRST_READ.json',
  'DEV_FACTORY_PREEXISTING_STATE.json',
  'PROTECTED_RESIDUE_BASELINE.json',
  'C33_MANIFEST_VALIDATION.json',
  'FROZEN_SUITE_IDENTITY.json',
  'BASE_RUNTIME_IDENTITY.json',
  'C33_SELECTED_RUNTIME_RECONSTRUCTION.json',
  'M01R_PRESERVATION_BASELINE.json',
  'PRIOR_ACCEPTED_RULE_PRESERVATION.json',
  'POST_M01R_REASON_FAMILY_SUMMARY.json',
  'POST_M01R_RESIDUAL_INVENTORY.json',
  'POST_M01R_RESIDUAL_OVERLAP_MAP.json',
  'REASON_ASSIGNMENT_PRECEDENCE_TRACE.json',
  'ACTIONABILITY_COMPLETENESS_AND_TAX_NEXUS_MATRIX.json',
  'CANDIDATE_HYPOTHESES.json',
  'RECOVERY_CHECKPOINT_15_R5_exact_M01R_reconstruction.json',
  'RECOVERY_CHECKPOINT_16_R6_216_row_residual_reconciliation.json',
  'RECOVERY_CHECKPOINT_17_R7_hypotheses_frozen.json',
]);
const C33_RESULT = path.join(C.ATT, C.SELECTED_C33_ATTEMPT, 'ITERATION_RESULT.json');
const C33_MANIFEST = path.join(C.RES, 'COMMIT_5R1C33_EVIDENCE_MANIFEST.sha256');
const REGISTRY = path.join(C.RES, 'CANONICAL_ATTEMPT_REGISTRY.json');
const ROADMAP = 'knowledge/TINA_Updated_Controlling_Roadmap_v9_Research_First_V1_2026.md';
const CURRENT_STATE = 'knowledge/CURRENT_STATE.md';
const STARTING_CURRENT_BLOB = '981b8ff17a0c166da0aad7a1af647b2cef99deab';
const STARTING_ROADMAP_BLOB = '167c5daf808edf3deb84280363db6bb1df9b161a';
const STARTING_ROADMAP_NORM =
  'bdb294ea1ee28849be8c0e4afae7a97c650a70445a96eb9023e194c04be777ae';
const UNIT = 'PHASE-10A14-R20 COMMIT 5R1-C34';
const GATE_NAME = 'commit5r1c34';
const CLAUDE_REVIEW_VERIFICATION_KEYS = Object.freeze([
  'rootCause',
  'nt01Disposition',
  'registryWalConsistency',
  'retryLinkage',
  'patchRemediation',
  'dualReplay',
  'candidateOnlyFullHeadSeparation',
  'candidateEvidence',
  'frozenGates',
  'roadmap',
  'currentState',
  'manifest',
  'serviceRestoration',
]);
const CLAUDE_REVIEW_JSON_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    decision: {
      type: 'string',
      enum: ['APPROVED', 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS', 'REJECTED'],
    },
    reviewedStateDigest: { type: 'string', pattern: '^[0-9a-f]{64}$' },
    reviewerTool: { type: 'string', const: 'Claude Code' },
    reviewerModel: { type: 'string', const: 'claude-opus-4-8' },
    independenceConfirmed: { type: 'boolean' },
    readOnlyConfirmed: { type: 'boolean' },
    commitSafe: { type: 'boolean' },
    summary: { type: 'string' },
    blockingFindings: { type: 'array', items: { type: 'string' } },
    nonblockingObservations: { type: 'array', items: { type: 'string' } },
    verification: {
      type: 'object',
      properties: Object.fromEntries(
        CLAUDE_REVIEW_VERIFICATION_KEYS.map((name) => [name, { type: 'boolean' }]),
      ),
      required: CLAUDE_REVIEW_VERIFICATION_KEYS,
      additionalProperties: false,
    },
  },
  required: [
    'decision',
    'reviewedStateDigest',
    'reviewerTool',
    'reviewerModel',
    'independenceConfirmed',
    'readOnlyConfirmed',
    'commitSafe',
    'summary',
    'blockingFindings',
    'nonblockingObservations',
    'verification',
  ],
  additionalProperties: false,
});

const packet = ({
  positives,
  substitutions,
  nearMisses,
  constructions,
  fillers,
  skeletons,
  taglish = [],
}) => ({ positives, substitutions, nearMisses, constructions, fillers, skeletons, taglish });

const NT_ORDINARY_INQUIRY = {
  id: 'C34-NT01-typed-ordinary-domain-inquiry-without-operation-is-no-tax-relation',
  cycle: 'nt01',
  frontier: 'no_tax_relation_vs_explicit_non_tax_task',
  principle:
    'An interrogative controlled by an ordinary legal, employment, corporate, or private-contract domain has no tax relation when it requests no performable operation and no governed tax relation controls it.',
  observablePredicate:
    'baseline explicit_non_tax_task + typed non-tax controlling domain + primary interrogative + no requested operation + no governed tax nexus + ordinary purchase exclusion',
  expectedReason: 'no_tax_relation',
  expectedDecision: 'REFUSE',
  forecastCorrections: 57,
  forecastTolerance: 5,
  taglishApplicable: true,
  block: String.raw`  const c34HasGovernedTaxRelation = v.rels.some((r) =>
    r === 'ASKS_TAX_TREATMENT_OF' || r === 'ASKS_VAT_TREATMENT_OF'
    || r === 'ASKS_DEDUCTIBILITY_OF' || r === 'ASKS_WITHHOLDING_ON'
    || r === 'ASKS_CUSTOMS_DUTY_ON' || r === 'ASKS_TAX_COMPLIANCE_FOR');
  const c34OrdinarySelectionRequest = /^(?:alin|ano|aling)\b[^?.!]*\b(?:na\s+)?bibilhin\b/i.test(v.t);
  const c34OrdinaryDomainInquiryHasNoTaxRelation = v.reason === 'explicit_non_tax_task'
      && evidence.nonTaxControllingDomain
      && evidence.primaryIsInterrogative
      && /\?\s*$/.test(v.t)
      && !evidence.reasonDenialAssertion
      && !evidence.reasonRequestsOperation
      && !c34HasGovernedTaxRelation
      && !evidence.governedTaxPredicateAnywhere
      && !evidence.taxRelationOverPrimaryTarget
      && !evidence.filipinoTaxRelationOverTarget
      && !evidence.contractQuestionAboutTaxClause
      && !c34OrdinarySelectionRequest;
  if (c34OrdinaryDomainInquiryHasNoTaxRelation)
    return { decision: 'REFUSE', reasonCode: 'no_tax_relation', confidence: 0.87 };
`,
  packet: packet({
    positives: [
      'Does a landlord need consent before replacing a broken gate?',
      'Can a tenant keep a spare key after a sublease ends?',
      'Which court handles a private dispute over a repaired chair?',
      'Which civil court hears a neighborhood loan dispute?',
      'Does a private supply agreement need notarization for delivery terms?',
      'Can a landlord terminate a garage lease for late payment?',
      'What happens when a contractor misses a delivery milestone?',
      'May an employer recover workshop costs under a training agreement?',
    ],
    substitutions: [
      'When may a tenant assign a studio lease to another renter?',
      'Does a sublease survive a change of landlord?',
      'What happens if a workshop contractor misses a delivery date?',
      'Can a labor arbiter reopen an illegal-dismissal case?',
      'When does a motion for reconsideration lapse in a civil case?',
      'Does an SEC report need board approval before submission?',
      'Can an insurance claim lawsuit include repair costs?',
      'What does a show cause order require from a corporation?',
    ],
    nearMisses: [
      'Which refrigerator should I buy for the apartment?',
      'Aling blender ang bibilhin para sa kusina?',
      'Can you write a private-lease termination letter?',
      'Please summarize the civil complaint.',
      'Is the monthly rent subject to VAT under the private lease?',
      'Can a lease include a taxable maintenance-cost clause?',
      'What is the deadline to protest a BIR deficiency assessment?',
      'Please file a labor complaint for the employee.',
    ],
    constructions: [
      'Could a tenant retain the mailbox key after moving out?',
      'Why would a civil court transfer a private debt dispute?',
      'May a landlord inspect a damaged stairway under a private lease?',
      'Can an employee file a workplace complaint after resignation?',
    ],
    fillers: [
      'Does a landlord need notice before ending a parking-space lease?',
      'Can a labor arbiter revisit a separation-pay dispute?',
      'Does an SEC report require a shareholder resolution?',
      'Which civil court hears an unpaid-appliance dispute?',
      'Can a buyer cancel a private supply agreement after partial delivery?',
    ],
    skeletons: [
      'May a tenant assign a garage lease to a neighbor?',
      'Which municipal court handles an ordinary bicycle-loan dispute?',
      'What happens when a builder misses a private contract deadline?',
      'Can a corporate secretary postpone an ordinary members meeting?',
      'Does a private catering agreement require witness signatures?',
    ],
    taglish: [
      'Kailangan ba ng notarization ang private apartment lease?',
      'Ano ang notice para matapos ang private equipment agreement?',
      'May karapatan ba ang tenant sa refundable security deposit?',
    ],
  }),
  leaveFamilyName: 'unseen_ordinary_domains_and_interrogative_constructions',
  leaveFamilyOut: [
    'Can shareholders inspect corporate minutes before an annual meeting?',
    'Does an unpaid personal loan survive the borrower moving abroad?',
    'May an employer recover relocation costs under a private contract?',
    'Can a school enrollment decision be challenged through an academic process?',
    'Does a club membership meeting need a written agenda?',
  ],
};

const NT_LOCAL_IDENTIFIER = {
  id: 'C34-NT02-local-identifier-redefinition-is-explicit-non-tax-task',
  cycle: 'nt02',
  frontier: 'no_tax_relation_vs_explicit_non_tax_task',
  principle:
    'A local redefinition that assigns a short token to an identified project, product, team, channel, or internal identifier role is a complete non-tax naming operation.',
  observablePredicate:
    'baseline no_tax_relation + local redefinition act + identifier role + no governed tax relation',
  expectedReason: 'explicit_non_tax_task',
  expectedDecision: 'REFUSE',
  forecastCorrections: 5,
  taglishApplicable: true,
  block: String.raw`  const c34IdentifierRole = /\b(?:(?:project|product|internal|team|channel)\s+)?(?:code|label|name|identifier|codename)\b/i.test(v.t);
  const c34LocalIdentifierRedefinition = v.reason === 'no_tax_relation'
      && evidence.reasonLocalRedefinitionAct
      && (evidence.namingActControlsRequest || c34IdentifierRole)
      && !evidence.governedTaxPredicateAnywhere
      && !v.rels.some((r) => r === 'ASKS_TAX_TREATMENT_OF' || r === 'ASKS_VAT_TREATMENT_OF'
        || r === 'ASKS_DEDUCTIBILITY_OF' || r === 'ASKS_WITHHOLDING_ON'
        || r === 'ASKS_CUSTOMS_DUTY_ON' || r === 'ASKS_TAX_COMPLIANCE_FOR');
  if (c34LocalIdentifierRedefinition)
    return { decision: 'REFUSE', reasonCode: 'explicit_non_tax_task', confidence: 0.88 };
`,
  packet: packet({
    positives: [
      'Project code lang ang SLSP? For our rollout.',
      'Internal code lang ang SLSP? This is our internal shorthand.',
      'SLSP ibig kong sabihin na project code namin? That is for the mobile-app launch.',
      'Project code lang ang SLSP? For sprint 13.',
      'Internal code lang ang SLSP? Tracker 19.',
      'Project code lang ang VAT? For our rollout.',
      'Internal code lang ang VAT? For launch 17.',
      'VAT ibig kong sabihin na project code namin? This is our internal shorthand.',
    ],
    substitutions: [
      'Project identifier lang ang AXM?',
      'Internal identifier lang ang BQN?',
      'Product label lang ang CRV?',
      'Team codename lang ang DSW?',
      'ETK ibig kong sabihin na project identifier namin?',
      'FUP ibig kong sabihin na channel code namin?',
      'Project code lang ang VAT? Version 18.',
      'HXY ibig kong sabihin na product code namin?',
    ],
    nearMisses: [
      'What is QRS?',
      'RMC is our internal project label.',
      'Rename the RMC project folder.',
      'Does RMC mean Revenue Memorandum Circular in BIR rules?',
      'Project code lang ang VAT, pero taxable ba ang sale?',
      'Is SLSP required for BIR filing?',
      'Define PAN in a BIR assessment.',
      'Aling laptop ang bibilhin?',
    ],
    constructions: [
      'Workshop code lang ang JAZ?',
      'Prototype label lang ba ang KBY?',
      'LCX ibig kong sabihin na internal identifier namin?',
      'Game code lang ang tawag namin sa MDY?',
    ],
    fillers: [
      'Software project code lang ang NEZ?',
      'Music channel code lang ang OFA?',
      'Product launch code lang ang PGB?',
      'Team exercise code lang ang QHC?',
      'Internal workflow identifier lang ang RID?',
    ],
    skeletons: [
      'Warehouse code lang ang SJE?',
      'Playlist identifier lang ba ang TKF?',
      'ULG ibig kong sabihin na prototype label namin?',
      'Workshop codename lang ang VMH?',
      'Game-team identifier lang ang WNI?',
    ],
    taglish: [
      'Project label lang ang XOJ?',
      'YPK ibig kong sabihin na team codename namin?',
      'Internal name lang ba ang ZQL?',
    ],
  }),
  leaveFamilyName: 'unseen_identifier_roles_and_short_tokens',
  leaveFamilyOut: [
    'Inventory code lang ang AMR?',
    'Festival playlist code lang ang BNS?',
    'Research prototype label lang ang CTO?',
    'Volunteer workshop codename lang ang DUP?',
    'Sports-team identifier lang ang EVQ?',
  ],
};

const TAX_COPULAR_TOPIC = {
  id: 'C34-TX01-copular-resolved-tax-topic-is-explicit-tax-task',
  cycle: 'tx01',
  frontier: 'explicit_tax_task_relation',
  principle:
    'A short resolved tax token in a copular tax-context question is an explicit tax-topic task when the request does not ask for a meaning or definition outcome.',
  observablePredicate:
    'baseline tax definition + ASKS_DEFINITION_OF + copular 3-5 character resolved tax token + no definition-outcome marker',
  expectedReason: 'explicit_tax_task_relation',
  expectedDecision: 'ALLOW',
  forecastCorrections: 4,
  taglishApplicable: true,
  block: String.raw`  const c34CopularShortTaxTopic = v.reason === 'tax_definition_with_context'
      && v.rels.includes('ASKS_DEFINITION_OF')
      && !evidence.reasonDefinitionOutcomeUnderTaxContext
      && /^(?:what\s+is|ano\s+ang)\s+[a-z]{3,5}(?:\s+(?:in|sa)\s+(?:an?\s+)?(?:bir|philippine tax|tax|revenue)[^?]*)?\?$/i.test(v.t)
      && !/\b(?:mean|meaning|define|definition|refer(?:s)?\s+to|stand(?:s)?\s+for)\b/i.test(v.t);
  if (c34CopularShortTaxTopic)
    return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.87 };
`,
  packet: packet({
    positives: [
      'What is CWT?',
      'What is MCIT in a BIR assessment review?',
      'What is RCIT in Philippine tax practice?',
      'What is FWT in a BIR assessment file?',
      'What is CGT in a revenue assessment review?',
      'What is FBT in a BIR assessment discussion?',
      'What is OSD in Philippine tax practice?',
      'What is VAT in a BIR assessment context?',
    ],
    substitutions: [
      'What is CWT in a revenue audit?',
      'What is MCIT in Philippine tax for a domestic company?',
      'What is RCIT in a BIR notice review?',
      'What is FWT in a BIR revenue examination?',
      'What is CGT in a BIR property audit?',
      'What is FBT in Philippine tax for compensation?',
      'What is OSD in a BIR deduction review?',
      'What is BOC in a BIR cross-agency assessment?',
    ],
    nearMisses: [
      'What does CWT mean in a BIR assessment?',
      'Define MCIT in Philippine tax.',
      'What does RCIT stand for under tax rules?',
      'What is XQD for item forty-two?',
      'What is VAT?',
      'What is LOA in a BIR audit?',
      'What is MCIT within corporate income-tax rules?',
      'Can you explain what FWT means in BIR rules?',
    ],
    constructions: [
      'What is DST in a revenue property review?',
      'What is EWT in a BIR payroll assessment?',
      'Ano ang MCIT sa BIR deficiency assessment?',
      'Ano ang RCIT sa Philippine tax practice?',
    ],
    fillers: [
      'What is CWT in a BIR farm-supplier audit?',
      'What is FWT in a BIR clinic assessment?',
      'What is RCIT in a revenue cooperative review?',
      'What is OSD in a BIR expense audit?',
      'What is CGT in a tax examination of inherited land?',
    ],
    skeletons: [
      'What is FBT in a BIR compensation procedure?',
      'What is DST in a revenue deed assessment?',
      'What is EWT in Philippine tax practice?',
      'What is CGT in a BIR property procedure?',
      'What is OSD in a revenue deduction assessment?',
    ],
    taglish: [
      'Ano ang CWT sa BIR payroll assessment?',
      'Ano ang FWT sa Philippine tax practice?',
      'Ano ang FBT sa BIR payroll assessment?',
    ],
  }),
  leaveFamilyName: 'unseen_resolved_tax_tokens_and_tax_contexts',
  leaveFamilyOut: [
    'What is FWT in a BIR deficiency review for a cooperative?',
    'What is CGT in a revenue case about a donated warehouse?',
    'What is FBT in a BIR compensation audit for a medical clinic?',
    'What is OSD in Philippine tax for an architecture studio?',
    'What is CWT in a BIR withholding review for a seed supplier?',
  ],
};

const TAX_IMPORT_DUTY_INSTRUMENT = {
  id: 'C34-TX02-import-duty-instrument-excluding-rate-classification-and-computation',
  cycle: 'tx02',
  frontier: 'explicit_tax_task_relation',
  principle:
    'An import-duty instrument or regime question is an explicit tax task when it does not ask for rate, tariff classification, schedule, or computation treatment.',
  observablePredicate:
    'baseline tax treatment + customs-duty relation + import-duty instrument + rate/classification/schedule/computation exclusions',
  expectedReason: 'explicit_tax_task_relation',
  expectedDecision: 'ALLOW',
  forecastCorrections: 7,
  taglishApplicable: true,
  block: String.raw`  const c34ImportDutyInstrumentTopic = v.reason === 'tax_treatment_of_ordinary_object'
      && v.rels.includes('ASKS_CUSTOMS_DUTY_ON')
      && /\bimport\s+dut(?:y|ies)\b/i.test(v.t)
      && !/\b(?:rate|classification|tariff\s+schedule|comput\w*|calculat\w*)\b/i.test(v.t);
  if (c34ImportDutyInstrumentTopic)
    return { decision: 'ALLOW', reasonCode: 'explicit_tax_task_relation', confidence: 0.86 };
`,
  packet: packet({
    positives: [
      'Is import duty payable before a charity parcel is released?',
      'What happens when undervaluation changes import duty on a donated machine?',
      'Which records support an import duty protest for a prototype shipment?',
      'How is import duty assessed for a refurbished-tablet shipment?',
      'Are import duties taxes under a regional trade rule?',
      'May import duty apply to a gift sent from overseas?',
      'Does import duty become payable when a courier releases the package?',
      'What evidence is needed for an import duty protest over a sample?',
    ],
    substitutions: [
      'When does import duty become payable on a returned appliance?',
      'How is import duty assessed after customs revaluation?',
      'Can import duties attach to an unsolicited parcel?',
      'What follows if import duty was underpaid on donated equipment?',
      'Are import duties considered national taxes?',
      'Which documents substantiate an import duty protest?',
      'May import duty arise on replacement goods?',
      'Does an import duty assessment follow undervaluation?',
    ],
    nearMisses: [
      'Could a revised tariff classification alter the import duty rate?',
      'How do I calculate import duty on a laptop?',
      'What is the import duty rate on shoes?',
      'Is a cooling fan subject to customs duty?',
      'May customs duty apply to imported equipment?',
      'How are customs duties paid before release?',
      'How do I file a customs protest?',
      'Which tariff schedule classifies the machine?',
    ],
    constructions: [
      'Is import duty payable on a donated weather sensor?',
      'What happens if import duty was underpaid on a repaired instrument?',
      'May import duty attach to replacement laboratory goods?',
      'Import duty on an unsolicited research parcel?',
    ],
    fillers: [
      'How is import duty assessed for a donated microscope?',
      'May import duty apply to donated school tablets?',
      'When is import duty payable on returned online goods?',
      'Can import duties attach to warranty replacements?',
      'Which records support an import duty protest for exhibit equipment?',
    ],
    skeletons: [
      'Is import duty payable on a marine-research shipment?',
      'How is import duty assessed for a laboratory glassware shipment?',
      'What evidence supports an import duty protest for a farm sensor?',
      'Are import duties taxes for a humanitarian parcel?',
      'When does import duty become payable on a repaired camera?',
    ],
    taglish: [
      'May import duty ba sa regalong parcel mula abroad?',
      'Kailan nagiging payable ang import duty sa replacement tools?',
      'Anong records ang kailangan sa import duty protest ng sample equipment?',
    ],
  }),
  leaveFamilyName: 'unseen_import_duty_events_objects_and_procedural_frames',
  leaveFamilyOut: [
    'May import duty apply to an ocean-research sample?',
    'How is import duty assessed for a touring orchestra shipment?',
    'What evidence supports an import duty protest for a greenhouse sensor?',
    'Are import duties taxes for an emergency-relief parcel?',
    'When does import duty become payable on a restored film camera?',
  ],
};

const TREATMENT_LEGAL_RULE = {
  id: 'C34-TR01-legal-rule-effect-or-contract-tax-clause-is-treatment',
  cycle: 'tr01',
  frontier: 'tax_treatment_of_ordinary_object',
  principle:
    'A tax statute or holding-period rule affecting a tax consequence, and a private contract question about a tax-allocation clause, asks treatment rather than an operational procedure.',
  observablePredicate:
    'baseline explicit tax task + no procedure + contract tax-clause or statute/rule effect frame',
  expectedReason: 'tax_treatment_of_ordinary_object',
  expectedDecision: 'ALLOW',
  forecastCorrections: 3,
  taglishApplicable: true,
  block: String.raw`  const c34TaxRuleEffectVerb = /\b(?:affect\w*|apply|applies|govern\w*|treat\w*|cover\w*)\b/i.test(v.t);
  const c34HoldingPeriodRule = /\bholding\s+period\s+rule\b/i.test(v.t);
  const c34LegalRuleBearsTaxTreatment = v.reason === 'explicit_tax_task_relation'
      && !evidence.proceduralComplianceFrame
      && !/\b(?:file|filing|form|remit\w*|payment|register\w*|submit\w*|comput\w*|calculat\w*)\b/i.test(v.t)
      && (evidence.contractQuestionAboutTaxClause
        || ((evidence.statuteInEffectFrame || c34HoldingPeriodRule) && c34TaxRuleEffectVerb));
  if (c34LegalRuleBearsTaxTreatment)
    return { decision: 'ALLOW', reasonCode: 'tax_treatment_of_ordinary_object', confidence: 0.87 };
`,
  packet: packet({
    positives: [
      'Does the NIRC govern the VAT treatment of donated inventory?',
      'Can the TRAIN law affect the tax treatment of a housing allowance?',
      'Does the CREATE law cover the income-tax treatment of a startup grant?',
      'How does the CMTA affect customs treatment of museum equipment?',
      'Does a holding period rule apply to gains from a used vehicle?',
      'Can a private service agreement include a withholding-allocation clause?',
      'May a lease contain a taxable costs clause?',
      'Does a deed include a documentary-stamp-tax allocation clause?',
    ],
    substitutions: [
      'Does the Tariff and Customs Code govern duty treatment of donated tools?',
      'Can the NIRC affect tax treatment of a cooperative rebate?',
      'Does the TRAIN law cover tax treatment of a transport allowance?',
      'How does the CREATE law affect income-tax treatment of a research grant?',
      'May a holding period rule apply to capital gains from artwork?',
      'Can a contract include a taxable costs clause?',
      'Does an agreement include a withholding-liability provision?',
      'May a deed carry a capital-gains-tax allocation clause?',
    ],
    nearMisses: [
      'Which BIR form does the TRAIN law require?',
      'How is tax computed under the NIRC?',
      'When must a return be filed under the CREATE law?',
      'Rename the TRAIN-law document.',
      'Can tariff classification change the customs duty rate?',
      'Is office rent subject to VAT?',
      'Can a private lease allocate cleaning costs?',
      'What does NIRC mean in Philippine tax?',
    ],
    constructions: [
      'Does the NIRC govern tax treatment of a donated generator?',
      'How does the CMTA affect customs treatment of borrowed equipment?',
      'Can a holding period rule apply to gains from antique furniture?',
      'May a warehouse lease include a taxable costs clause?',
    ],
    fillers: [
      'Can the TRAIN law affect tax treatment of a meal allowance?',
      'Does the NIRC govern VAT treatment of donated books?',
      'How does the CMTA affect customs treatment of exhibit lights?',
      'Can a service agreement include a withholding-cost clause?',
      'May a property deed contain a documentary-stamp-tax liability provision?',
    ],
    skeletons: [
      'Does the CREATE law govern tax treatment of a community grant?',
      'How does the Tariff and Customs Code affect Philippine import duty?',
      'Does a holding period rule apply to gains from a musical instrument?',
      'Can a consulting contract include an income-tax allocation clause?',
      'Can a farm lease contain a taxable costs clause?',
    ],
    taglish: [
      'Sakop ba ng TRAIN law ang tax treatment ng housing benefit?',
      'Pwede bang may taxable costs clause ang private office lease?',
      'Paano affect ng Tariff and Customs Code ang Philippine import duty sa donated equipment?',
    ],
  }),
  leaveFamilyName: 'unseen_statutes_rules_contracts_and_ordinary_bearers',
  leaveFamilyOut: [
    'Does the NIRC govern VAT treatment of a community-library donation?',
    'Can the TRAIN law affect tax treatment of a rural-clinic stipend?',
    'Does a holding period rule apply to gains from a vintage instrument?',
    'May a cooperative agreement include a withholding-allocation clause?',
    'May an agricultural lease include a taxable costs clause?',
  ],
};

const COMPLIANCE_REMEDY_DEADLINE = {
  id: 'C34-CP01-tax-administrative-remedy-deadline-is-compliance',
  cycle: 'cp01',
  frontier: 'tax_compliance_task',
  principle:
    'An interrogative deadline, due-date, or prescriptive-period request for protesting, appealing, objecting to, contesting, or responding to a tax-administration assessment is a compliance task.',
  observablePredicate:
    'baseline explicit tax task + primary interrogative + administrative remedy time + remedy act + tax-administration anchor + ordinary-domain exclusions',
  expectedReason: 'tax_compliance_task',
  expectedDecision: 'ALLOW',
  forecastCorrections: 1,
  taglishApplicable: true,
  block: String.raw`  const c34AdministrativeRemedyTime = /\b(?:deadline|due\s+date|prescriptive\s+period)\b/i.test(v.t);
  const c34AdministrativeRemedyAct = /\b(?:protest(?:s|ed|ing)?|appeal(?:s|ed|ing)?|object(?:s|ed|ing|ion)?|contest(?:s|ed|ing)?|respond(?:s|ed|ing)?|repl(?:y|ies|ied|ying))\b/i.test(v.t);
  const c34TaxAdministrationAnchor = /\b(?:bir|bureau of internal revenue|assessment|deficiency|tax|revenue|notice)\b/i.test(v.t);
  const c34TaxRemedyDeadlineIsCompliance = v.reason === 'explicit_tax_task_relation'
      && evidence.primaryIsInterrogative
      && c34AdministrativeRemedyTime && c34AdministrativeRemedyAct && c34TaxAdministrationAnchor
      && !evidence.nonTaxControllingDomain && !evidence.ordinaryProceduralSense
      && !/\b(?:civil|labor|school|private|court)\b/i.test(v.t);
  if (c34TaxRemedyDeadlineIsCompliance)
    return { decision: 'ALLOW', reasonCode: 'tax_compliance_task', confidence: 0.88 };
`,
  packet: packet({
    positives: [
      'What is the deadline to appeal a BIR deficiency assessment?',
      'When is the due date to protest a revenue assessment notice?',
      'Which deadline applies to objecting to a BIR deficiency notice?',
      'How long is the prescriptive period to contest a tax assessment?',
      'What is the deadline to respond to a BIR assessment notice?',
      'Which due date controls an appeal from a revenue deficiency notice?',
      'What prescriptive period governs a protest of a tax assessment?',
      'When is the deadline to reply to a BIR deficiency notice?',
    ],
    substitutions: [
      'What is the deadline to contest a VAT assessment?',
      'When is the due date to appeal an income-tax deficiency notice?',
      'Which deadline governs an objection to a withholding assessment?',
      'How long is the prescriptive period to protest an estate-tax assessment?',
      'What deadline applies to responding to a BIR assessment notice?',
      'Which due date governs a reply to a BIR assessment?',
      'When is the deadline to object to a deficiency-tax notice?',
      'What prescriptive period controls an appeal of a BIR assessment?',
    ],
    nearMisses: [
      'Tax protest deadline.',
      'What is the deadline to file an income-tax return?',
      'What happens after a BIR assessment?',
      'What is the civil-court deadline to appeal?',
      'When is a labor appeal due?',
      'Is assessment interest taxable?',
      'How is deficiency tax computed?',
      'Can you write a BIR protest letter?',
    ],
    constructions: [
      'What is the deadline to reply to a BIR revenue assessment notice?',
      'When is the due date to contest a BIR deficiency?',
      'Which deadline governs an appeal of a tax notice?',
      'How long is the prescriptive period to respond to an assessment?',
    ],
    fillers: [
      'What is the deadline to protest a VAT deficiency assessment?',
      'When is the due date to appeal a withholding assessment notice?',
      'Which deadline governs an income-tax deficiency objection?',
      'How long is the prescriptive period to contest an estate-tax deficiency?',
      'What is the deadline to respond to a BIR excise notice?',
    ],
    skeletons: [
      'Which deadline controls a protest of a donor-tax assessment?',
      'What due date applies to an appeal from a percentage-tax notice?',
      'How long is the prescriptive period to object to an excise assessment?',
      'When is the deadline to contest a documentary-stamp-tax deficiency?',
      'What is the deadline to object to a BIR revenue assessment?',
    ],
    taglish: [
      'Kailan ang deadline to protest ang BIR deficiency assessment?',
      'Ano ang due date to appeal ang BIR assessment notice?',
      'Kailan ang deadline to object sa BIR excise assessment?',
    ],
  }),
  leaveFamilyName: 'unseen_tax_types_remedy_verbs_and_taxpayer_contexts',
  leaveFamilyOut: [
    "What is the deadline to protest a donor's-tax assessment for a family foundation?",
    'When is the due date to appeal a percentage-tax deficiency for a food kiosk?',
    'Which deadline governs an objection to an excise assessment for a craft producer?',
    'How long is the prescriptive period to contest a documentary-stamp-tax assessment for a cooperative?',
    'What is the deadline to respond to a BIR notice issued to a medical practice?',
  ],
};

const CANDIDATES = [
  NT_ORDINARY_INQUIRY,
  NT_LOCAL_IDENTIFIER,
  TAX_COPULAR_TOPIC,
  TAX_IMPORT_DUTY_INSTRUMENT,
  TREATMENT_LEGAL_RULE,
  COMPLIANCE_REMEDY_DEADLINE,
];

const hypothesis = (
  id,
  frontier,
  principle,
  observablePredicate,
  targetCount,
  candidate = null,
  risks = [],
) => ({
  id,
  frontier,
  principle,
  observablePredicate,
  targetCountForecast: targetCount,
  executionCandidateId: candidate?.id || null,
  activeBase: C.C33_IDENTITY.servicesTreeDigest,
  forecast: targetCount > 0
    ? 'bounded strict reason-only improvement is structurally plausible'
    : 'control hypothesis or later structural separator',
  nearestControls:
    'two-pass nearest base-correct controls are recorded in the C34 residual inventory and candidate packet',
  m01rOverlap:
    'zero forecast; every material attempt must preserve all 22 M01R corrections and all M01R packet/LFO rows',
  rejectedRuleOverlap:
    'must not reproduce C33 M02R, C32/C33 M03, broad noun-phrase routing, or declarative non-tax expansion routing',
  packetPlan: candidate
    ? 'execute 8+ positives, 8+ substitutions, 8+ near misses, 4+ constructions, 5+ fillers, 5+ concrete skeletons, Taglish where applicable, and 5+ LFO rows'
    : 'specified but not allocated within the six-attempt material budget',
  taint:
    'no oracle ID, query hash, expected label, source set, family, row order, fixture membership, or frozen-query dependency',
  precedence:
    'pure governed override after inherited accepted rules and before the terminating null return; unmatched inputs preserve the exact active base',
  composition:
    'must be cumulative, order-independent, non-shadowing, and exactly replayable with every accepted C34 rule',
  ambiguityRisks: risks,
  plannedDisposition: candidate ? 'MATERIAL_CANDIDATE' : 'NOT_EXECUTED_BUDGET_LIMIT',
});

const HYPOTHESES = [
  hypothesis('C34-NT-H01', 'no_tax_relation_vs_explicit_non_tax_task',
    NT_ORDINARY_INQUIRY.principle, NT_ORDINARY_INQUIRY.observablePredicate, 57,
    NT_ORDINARY_INQUIRY, ['ordinary purchase/recommendation and contract tax-clause questions are exact exclusions']),
  hypothesis('C34-NT-H02', 'no_tax_relation_vs_explicit_non_tax_task',
    NT_LOCAL_IDENTIFIER.principle, NT_LOCAL_IDENTIFIER.observablePredicate, 5,
    NT_LOCAL_IDENTIFIER, ['local identifier redefinition must not absorb definitions or governed tax clauses']),
  hypothesis('C34-NT-H03', 'no_tax_relation_vs_explicit_non_tax_task',
    'A complete imperative with a concrete ordinary object is an explicit non-tax task.',
    'imperative operation + available concrete ordinary operand + requested output', 0),
  hypothesis('C34-NT-H04', 'no_tax_relation_vs_explicit_non_tax_task',
    'A content transformation is a task only when its source operand is available.',
    'summarize/translate/format + available source content versus missing content', 0),
  hypothesis('C34-NT-H05', 'no_tax_relation_vs_explicit_non_tax_task',
    'An ordinary topic inquiry is no relation; a requested drafting output is an explicit task.',
    'interrogative discussion versus draft/write/prepare + identified output', 0),
  hypothesis('C34-NT-H06', 'no_tax_relation_vs_explicit_non_tax_task',
    'A quoted-token operation differs from an operation on an identified external artifact.',
    'quoted mention scope versus concrete artifact operation', 0),
  hypothesis('C34-NT-H07', 'no_tax_relation_vs_explicit_non_tax_task',
    'A bare operational-artifact nominal might imply an explicit task only with an independently observable output frame.',
    'bare artifact nominal + requested-output separator not presently available', 0, null,
    ['broad noun-phrase routing is prohibited and has colliding controls']),
  hypothesis('C34-NT-H08', 'no_tax_relation_vs_explicit_non_tax_task',
    'A declarative local gloss may be no relation when no operation controls it.',
    'declarative expansion/gloss with no operation', 0, null,
    ['unchanged declarative non-tax expansion routing is prohibited']),
  hypothesis('C34-XT-H01', 'explicit_tax_task_relation',
    TAX_COPULAR_TOPIC.principle, TAX_COPULAR_TOPIC.observablePredicate, 4,
    TAX_COPULAR_TOPIC, ['meaning, define, stands-for, unknown-token, and metadata-only controls']),
  hypothesis('C34-XT-H02', 'explicit_tax_task_relation',
    TAX_IMPORT_DUTY_INSTRUMENT.principle, TAX_IMPORT_DUTY_INSTRUMENT.observablePredicate, 7,
    TAX_IMPORT_DUTY_INSTRUMENT,
    ['lowest-confidence candidate; lexical residual shaping and treatment collisions require strong packet/LFO evidence']),
  hypothesis('C34-XT-H03', 'explicit_tax_task_relation',
    'A certificate or form operation is a tax task when an action is requested, not when the instrument is only defined.',
    'obtain/issue/complete + form or certificate versus meaning/definition', 0, null,
    ['withholding-instrument overlap is an exact M02R control']),
  hypothesis('C34-XT-H04', 'explicit_tax_task_relation',
    'An assessment consequence is an explicit tax topic while a protest obligation is compliance.',
    'assessment outcome versus protest/appeal procedural frame', 0),
  hypothesis('C34-XT-H05', 'explicit_tax_task_relation',
    'Substantiation records for a tax position differ from records submitted in a filing procedure.',
    'records + support tax position versus submit/attach/file records', 0),
  hypothesis('C34-TR-H01', 'tax_treatment_of_ordinary_object',
    TREATMENT_LEGAL_RULE.principle, TREATMENT_LEGAL_RULE.observablePredicate, 3,
    TREATMENT_LEGAL_RULE, ['procedure verbs and non-tax contract clauses must remain excluded']),
  hypothesis('C34-TR-H02', 'tax_treatment_of_ordinary_object',
    'Passive consequence wording over an external bearer denotes treatment.',
    'passive taxable/deductible/covered consequence + ordinary bearer + no procedure', 0),
  hypothesis('C34-TR-H03', 'tax_treatment_of_ordinary_object',
    'Indirect rate, base, or exemption consequence wording denotes treatment unless computation is requested.',
    'rate/base/exemption effect + ordinary bearer + computation exclusion', 0),
  hypothesis('C34-CP-H01', 'tax_compliance_task',
    COMPLIANCE_REMEDY_DEADLINE.principle, COMPLIANCE_REMEDY_DEADLINE.observablePredicate, 1,
    COMPLIANCE_REMEDY_DEADLINE, ['single R3 correction is supported only by a family-level packet']),
  hypothesis('C34-CP-H02', 'tax_compliance_task',
    'A deadline across filing, registration, remittance, submission, attachment, and payment is compliance only when a requested procedural outcome is identified.',
    'deadline/due date + required tax procedure + concrete form/payment/record target', 0),
];

const abs = (value) => path.resolve(C.REPO, value);
const artifact = (name) => path.join(C.RES, `COMMIT_5R1C34_${name}`);
const normalizeQuery = (query) => String(query).trim().replace(/\s+/g, ' ').toLowerCase();
const git = (...args) => C.git(...args);
const gitDev = (...args) => execFileSync(
  'git',
  ['-c', 'safe.directory=C:/Projects/tina-dev-factory', '-C', 'C:/Projects/tina-dev-factory', ...args],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 },
);

function writeOnceText(file, text) {
  const absolute = path.resolve(file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, String(text).replace(/\r\n/g, '\n'), { flag: 'wx' });
  return absolute;
}

function writeOnceJson(file, value) {
  return writeOnceText(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeOnceOrSameText(file, text) {
  const normalized = String(text).replace(/\r\n/g, '\n');
  const absolute = path.resolve(file);
  if (fs.existsSync(absolute)) {
    C.requirePass(
      fs.readFileSync(absolute, 'utf8') === normalized,
      `C34_EXISTING_EVIDENCE_DIFFERS_${C.rel(absolute)}`,
    );
    return absolute;
  }
  return writeOnceText(absolute, normalized);
}

function writeOnceOrSameJson(file, value) {
  return writeOnceOrSameText(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMutableJson(file, value) {
  const absolute = path.resolve(file);
  const temporary = `${absolute}.c34-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, absolute);
}

function hashRecord(file) {
  const absolute = path.resolve(file);
  const bytes = fs.readFileSync(absolute);
  return {
    path: C.rel(absolute),
    bytes: bytes.length,
    sha256: C.sha(bytes),
  };
}

function checkpoint({
  stage,
  status,
  activeBaseHash,
  attemptId = null,
  artifacts = [],
  nextExactOperation,
  safeToResume,
  blocker = null,
}) {
  const priorLog = fs.existsSync(RECOVERY_CHECKPOINT_LOG)
    ? fs.readFileSync(RECOVERY_CHECKPOINT_LOG)
    : Buffer.alloc(0);
  const ordinal = priorLog.length
    ? priorLog.toString('utf8').split(/\r?\n/).filter(Boolean).length + 1
    : 1;
  const eventWithoutHash = {
    schemaVersion: 2,
    ordinal,
    commitUnit: 'PHASE-10A14-R20-COMMIT-5R1-C34',
    updatedAtUtc: C.now(),
    stage,
    status,
    head: git('rev-parse', 'HEAD').trim(),
    activeBaseHash,
    attemptId,
    artifactHashes: artifacts.filter((file) => fs.existsSync(file)).map(hashRecord),
    previousLogSha256: C.sha(priorLog),
    nextExactOperation,
    safeToResume,
    blocker,
  };
  const event = {
    ...eventWithoutHash,
    eventSha256: C.sha(Buffer.from(JSON.stringify(eventWithoutHash))),
  };
  writeMutableJson(RECOVERY_CHECKPOINT, event);
  fs.appendFileSync(RECOVERY_CHECKPOINT_LOG, `${JSON.stringify(event)}\n`);
  const safeStage = stage.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const numbered = artifact(
    `RECOVERY_CHECKPOINT_${String(ordinal).padStart(2, '0')}_${safeStage}.json`,
  );
  writeOnceJson(numbered, event);
  return event;
}

function appendIdempotentCheckpoint({
  ordinal,
  updatedAtUtc,
  stage,
  status,
  activeBaseHash,
  attemptId = null,
  artifacts = [],
  nextExactOperation,
  safeToResume,
  blocker = null,
}) {
  C.requirePass(Number.isInteger(ordinal) && ordinal > 0, 'C34_IDEMPOTENT_CHECKPOINT_ORDINAL_INVALID');
  C.requirePass(
    typeof updatedAtUtc === 'string' && Number.isFinite(Date.parse(updatedAtUtc)),
    'C34_IDEMPOTENT_CHECKPOINT_TIMESTAMP_INVALID',
  );
  for (const file of artifacts) {
    C.requirePass(fs.existsSync(file), `C34_IDEMPOTENT_CHECKPOINT_ARTIFACT_MISSING_${C.rel(file)}`);
  }
  const logBytes = fs.existsSync(RECOVERY_CHECKPOINT_LOG)
    ? fs.readFileSync(RECOVERY_CHECKPOINT_LOG)
    : Buffer.alloc(0);
  const lines = logBytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  C.requirePass(
    lines.length === ordinal - 1 || lines.length === ordinal,
    `C34_IDEMPOTENT_CHECKPOINT_LOG_LENGTH_${lines.length}_EXPECTED_${ordinal - 1}_OR_${ordinal}`,
  );
  const prefixLines = lines.slice(0, ordinal - 1);
  const prefixBytes = prefixLines.length
    ? Buffer.from(`${prefixLines.join('\n')}\n`)
    : Buffer.alloc(0);
  const eventWithoutHash = {
    schemaVersion: 2,
    ordinal,
    commitUnit: 'PHASE-10A14-R20-COMMIT-5R1-C34',
    updatedAtUtc,
    stage,
    status,
    head: git('rev-parse', 'HEAD').trim(),
    activeBaseHash,
    attemptId,
    artifactHashes: artifacts.map(hashRecord),
    previousLogSha256: C.sha(prefixBytes),
    nextExactOperation,
    safeToResume,
    blocker,
  };
  const event = {
    ...eventWithoutHash,
    eventSha256: C.sha(Buffer.from(JSON.stringify(eventWithoutHash))),
  };
  const safeStage = stage.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const numbered = artifact(
    `RECOVERY_CHECKPOINT_${String(ordinal).padStart(2, '0')}_${safeStage}.json`,
  );
  if (lines.length === ordinal) {
    const existing = JSON.parse(lines[ordinal - 1]);
    C.requirePass(
      JSON.stringify(existing) === JSON.stringify(event),
      `C34_IDEMPOTENT_CHECKPOINT_EXISTING_EVENT_DIFFERS_${ordinal}`,
    );
    C.requirePass(fs.existsSync(numbered), `C34_IDEMPOTENT_CHECKPOINT_NUMBERED_MISSING_${ordinal}`);
    C.requirePass(
      JSON.stringify(C.readJson(numbered)) === JSON.stringify(event),
      `C34_IDEMPOTENT_CHECKPOINT_NUMBERED_DIFFERS_${ordinal}`,
    );
    const current = fs.existsSync(RECOVERY_CHECKPOINT)
      ? C.readJson(RECOVERY_CHECKPOINT)
      : null;
    const previous = ordinal > 1 ? JSON.parse(lines[ordinal - 2]) : null;
    C.requirePass(
      current == null
        || JSON.stringify(current) === JSON.stringify(event)
        || JSON.stringify(current) === JSON.stringify(previous),
      `C34_IDEMPOTENT_CHECKPOINT_CURRENT_CONFLICT_${ordinal}`,
    );
    if (JSON.stringify(current) !== JSON.stringify(event)) {
      writeMutableJson(RECOVERY_CHECKPOINT, event);
    }
    return { event, numbered, appended: false };
  }
  if (lines.length) {
    C.requirePass(
      JSON.stringify(C.readJson(RECOVERY_CHECKPOINT)) === JSON.stringify(JSON.parse(lines.at(-1))),
      'C34_IDEMPOTENT_CHECKPOINT_CURRENT_NOT_AT_LOG_TIP',
    );
  }
  if (fs.existsSync(numbered)) {
    C.requirePass(
      JSON.stringify(C.readJson(numbered)) === JSON.stringify(event),
      `C34_IDEMPOTENT_CHECKPOINT_RECOVERY_NUMBERED_DIFFERS_${ordinal}`,
    );
  } else {
    writeOnceJson(numbered, event);
  }
  fs.appendFileSync(RECOVERY_CHECKPOINT_LOG, `${JSON.stringify(event)}\n`);
  writeMutableJson(RECOVERY_CHECKPOINT, event);
  return { event, numbered, appended: true };
}

function numberedCheckpointPath(ordinal) {
  const matches = fs.readdirSync(C.RES)
    .filter((name) => name.startsWith(
      `COMMIT_5R1C34_RECOVERY_CHECKPOINT_${String(ordinal).padStart(2, '0')}_`,
    ));
  C.requirePass(matches.length === 1, `C34_NUMBERED_CHECKPOINT_${ordinal}_COUNT_${matches.length}`);
  return path.join(C.RES, matches[0]);
}

function checkpoint25To27Continuity() {
  const chain = validateCheckpointChain();
  const logLines = fs.readFileSync(RECOVERY_CHECKPOINT_LOG, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);
  const records = [25, 26, 27].map((ordinal) => {
    const numbered = numberedCheckpointPath(ordinal);
    const numberedRecord = C.readJson(numbered);
    const logRecord = JSON.parse(logLines[ordinal - 1]);
    const { eventSha256, ...withoutHash } = numberedRecord;
    const record = {
      ordinal,
      numbered: hashRecord(numbered),
      expectedNumberedSha256: TIMEBOX_CHECKPOINT_HASHES[ordinal],
      logObjectMatches: JSON.stringify(numberedRecord) === JSON.stringify(logRecord),
      eventSha256,
      actualEventSha256: C.sha(Buffer.from(JSON.stringify(withoutHash))),
    };
    record.pass = record.numbered.sha256 === record.expectedNumberedSha256
      && record.logObjectMatches
      && record.eventSha256 === record.actualEventSha256
      && numberedRecord.ordinal === ordinal;
    return record;
  });
  const checkpoint27 = C.readJson(numberedCheckpointPath(27));
  const result = {
    chain,
    records,
    checkpoint27,
    safePauseArtifact: hashRecord(CHECKPOINT_27_SAFE_PAUSE),
    safePauseManifest: hashRecord(CHECKPOINT_27_SAFE_PAUSE_MANIFEST),
    pass: false,
  };
  result.pass = chain.pass
    && chain.rows >= 27
    && records.every((record) => record.pass)
    && checkpoint27.stage === 'linked retry pre-allocation safe pause'
    && checkpoint27.status === 'PAUSED_SAFE_TO_RESUME'
    && checkpoint27.safeToResume === true
    && checkpoint27.attemptId == null
    && checkpoint27.activeBaseHash === C.C33_IDENTITY.servicesTreeDigest
    && result.safePauseArtifact.sha256
      === 'afe9b0176076174eb701d6dc19204001550184743a3cf177007192ff39fef9a3'
    && result.safePauseManifest.sha256
      === 'cf1e30b35d4c9fff23d335f6d77c55e9dcccdde8bab2950f95649e2e41346f1e';
  C.requirePass(result.pass, `C34_CHECKPOINT_25_TO_27_CONTINUITY_FAILED_${JSON.stringify(result)}`);
  return result;
}

function sourceSliceRecord(label, startMarker, endMarker) {
  const source = fs.readFileSync(C.RUNNER, 'utf8');
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  C.requirePass(start >= 0 && end > start, `C34_RUNNER_SOURCE_SLICE_NOT_FOUND_${label}`);
  const bytes = Buffer.from(source.slice(start, end));
  return { label, startMarker, endMarker, bytes: bytes.length, sha256: C.sha(bytes) };
}

function amendedRunnerBinding() {
  return {
    runner: hashRecord(C.RUNNER),
    lib: hashRecord('evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs'),
    processInspectionSource: sourceSliceRecord(
      'processAndPortState',
      'function processAndPortState() {',
      '\nfunction validateC33Manifest() {',
    ),
    technicalRecoveryPreflightSource: sourceSliceRecord(
      'technicalRecoveryPreflight',
      'function technicalRecoveryPreflight(',
      '\nasync function loadDebugAnalyzerFrom(',
    ),
  };
}

const MANDATORY_TOP_LEVEL = [
  CURRENT_STATE,
  ROADMAP,
  'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
  'knowledge/TINA_Updated_Roadmap_v7.md',
  'evaluation/runner/phase-10a14-r20/commit5r1c33-execute.mjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c20-lib.mjs',
  'evaluation/runner/phase-10a14-r20/commit5r1c20-gates.mjs',
  'evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_FINAL_EXECUTION_REPORT.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_INDEPENDENT_REVIEW.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_INDEPENDENT_REVIEW.md',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_OPUS_REVIEW_REJECTION_01.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_OPUS_REVIEW_REJECTION_01.md',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_CANDIDATE_HYPOTHESES.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_CANDIDATE_EXHAUSTION.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_GENERALIZATION_QUERY_RESULTS.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_RULE_GENERALIZATION_PACKETS.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_LEAVE_ONE_FAMILY_OUT_RESULTS.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_SENTINEL_SUBSTITUTION_RESULT.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_INDEPENDENT_ROW_SHUFFLE_RESULT.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_ROW_LEVEL_PARETO_COMPARISON.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_WRONG_TO_DIFFERENT_WRONG.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_PRIOR_OVERRIDE_REGRESSION.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_BRANCH_SIGNATURE_DRIFT.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_MONOTONIC_FEATURE_BASELINE.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_MONOTONIC_FEATURE_ABLATION.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_COMPOSITION_ORDER_INDEPENDENCE.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_COMPOSITION_ROW_DELTA.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_CANDIDATE_DELTA_REPLAY_RESULT.json',
  'evaluation/results/phase-10a14-r20/COMMIT_5R1C33_EVIDENCE_MANIFEST.sha256',
];

function mandatoryFirstRead() {
  C.requirePass(
    fs.existsSync(PREALLOCATION_VALIDATION),
    'C34_PREALLOCATION_VALIDATION_MISSING_FOR_FIRST_READ_CONTINUITY',
  );
  const preallocation = C.readJson(PREALLOCATION_VALIDATION);
  C.requirePass(
    preallocation.decision === 'PASS_READY_FOR_FIRST_ATTEMPT',
    `C34_PREALLOCATION_NOT_READY_${preallocation.decision}`,
  );
  const validation = preallocation.mandatoryFirstReadValidation;
  C.requirePass(validation?.pass === true, 'C34_MANDATORY_FIRST_READ_VALIDATION_NOT_PASS');
  C.requirePass(validation.fileCount === 156, `C34_MANDATORY_FIRST_READ_COUNT_${validation.fileCount}`);
  C.requirePass(
    validation.totalBytes === 15320821,
    `C34_MANDATORY_FIRST_READ_BYTES_${validation.totalBytes}`,
  );
  C.requirePass(
    validation.explicitRequiredFiles === MANDATORY_TOP_LEVEL.length,
    `C34_MANDATORY_FIRST_READ_EXPLICIT_COUNT_${validation.explicitRequiredFiles}`,
  );
  C.requirePass(
    validation.completeAttemptDirectoriesRead === 6
      && validation.c33AttemptDirectories.length === 6,
    'C34_MANDATORY_FIRST_READ_ATTEMPT_DIRECTORY_COUNT',
  );
  C.requirePass(
    Array.isArray(validation.missing) && validation.missing.length === 0,
    'C34_MANDATORY_FIRST_READ_MISSING_FILES',
  );
  return {
    unit: UNIT,
    generatedUtc: C.now(),
    recoveryContext:
      'The prior executor completed the full read before transfer. The account-transfer preallocation artifact independently validated the same immutable 156-file inventory; semantic execution consumes that durable validation without rereading the entire set.',
    ...validation,
    validationArtifact: C.rel(PREALLOCATION_VALIDATION),
    repeatedDuringSemanticExecution: false,
  };
}

function devFactoryState(label) {
  const status = gitDev('status', '--porcelain=v2', '--branch');
  const diff = gitDev('diff', '--binary', 'HEAD');
  return {
    unit: UNIT,
    label,
    capturedUtc: C.now(),
    repository: 'C:/Projects/tina-dev-factory',
    head: gitDev('rev-parse', 'HEAD').trim(),
    branch: gitDev('branch', '--show-current').trim(),
    statusSha256: C.sha(Buffer.from(status)),
    trackedDiffSha256: C.sha(Buffer.from(diff)),
    status,
    trackedDiffBytes: Buffer.byteLength(diff),
  };
}

function protectedResidue(label) {
  const status = git('status', '--porcelain=v1', '--untracked-files=all');
  const protectedPrefixes = ['.claude/', '.vscode/', 'evaluation/factcheck/'];
  const files = protectedPrefixes
    .map((prefix) => path.resolve(C.REPO, prefix))
    .filter((directory) => fs.existsSync(directory))
    .flatMap((directory) => C.recursiveFiles(directory))
    .sort((first, second) => C.rel(first).localeCompare(C.rel(second)));
  return {
    unit: UNIT,
    label,
    capturedUtc: C.now(),
    enumerationMethod:
      'direct recursive filesystem inventory independent of Git global-ignore and privilege state',
    protectedPrefixes,
    statusSha256: C.sha(Buffer.from(status)),
    protectedItems: files.map((file) => C.rel(file)),
    fileRecords: files.map(hashRecord),
  };
}

function protectedResidueKey(state) {
  return JSON.stringify(state.fileRecords.map((record) => ({
    path: record.path,
    bytes: record.bytes,
    sha256: record.sha256,
  })).sort((first, second) => first.path.localeCompare(second.path)));
}

function processAndPortState() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tina-c34-process-inspection-'));
  const inspector = path.join(temporaryRoot, 'inspect-node-processes.js');
  const inspectorSource = [
    'try {',
    '  var locator = new ActiveXObject("WbemScripting.SWbemLocator");',
    '  var service = locator.ConnectServer(".", "root\\\\cimv2");',
    '  var query = service.ExecQuery("SELECT ProcessId,ParentProcessId,CommandLine FROM Win32_Process WHERE Name=\'node.exe\'");',
    '  WScript.Echo("C34_PROCESS_INSPECTION_V1");',
    '  for (var rows = new Enumerator(query); !rows.atEnd(); rows.moveNext()) {',
    '    var row = rows.item();',
    '    var commandLine = row.CommandLine;',
    '    var readable = commandLine !== null && typeof commandLine !== "undefined" && String(commandLine).length > 0;',
    '    WScript.Echo(String(row.ProcessId) + "\\t" + String(row.ParentProcessId) + "\\t" + (readable ? "1" : "0") + "\\t" + encodeURIComponent(readable ? String(commandLine) : ""));',
    '  }',
    '  WScript.Echo("C34_PROCESS_INSPECTION_END");',
    '} catch (error) {',
    '  WScript.StdErr.WriteLine("C34_PROCESS_INSPECTION_ERROR " + (error.description || error.message || String(error)));',
    '  WScript.Quit(2);',
    '}',
  ].join('\r\n');
  fs.writeFileSync(inspector, inspectorSource, { flag: 'wx' });
  let processResult;
  let cleanupSucceeded = false;
  try {
    processResult = spawnSync(
      'C:/WINDOWS/System32/cscript.exe',
      ['//NoLogo', '//E:JScript', inspector],
      {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        timeout: 30000,
        windowsHide: true,
      },
    );
  } finally {
    removeOwnedTemp(temporaryRoot, 'tina-c34-process-inspection-');
    cleanupSucceeded = !fs.existsSync(temporaryRoot);
  }
  const rawLines = (processResult?.stdout || '').split(/\r?\n/).filter(Boolean);
  const protocolValid = rawLines[0] === 'C34_PROCESS_INSPECTION_V1'
    && rawLines.at(-1) === 'C34_PROCESS_INSPECTION_END'
    && rawLines.slice(1, -1).every((line) => /^\d+\t\d+\t[01]\t.*$/.test(line));
  const parsedProcesses = [];
  let parseError = null;
  if (protocolValid) {
    try {
      for (const line of rawLines.slice(1, -1)) {
        const [pidText, parentPidText, readableText, encodedCommandLine] = line.split('\t');
        parsedProcesses.push({
          ProcessId: Number(pidText),
          ParentProcessId: Number(parentPidText),
          CommandLine: readableText === '1' ? decodeURIComponent(encodedCommandLine) : null,
        });
      }
    } catch (error) {
      parseError = error?.message || String(error);
    }
  }
  parsedProcesses.sort((first, second) => first.ProcessId - second.ProcessId);
  const duplicatePids = parsedProcesses.filter((item, index) =>
    parsedProcesses.findIndex((candidate) => candidate.ProcessId === item.ProcessId) !== index);
  const currentExecutorRecord = parsedProcesses.find((item) => item.ProcessId === process.pid);
  const currentExecutorPresent = currentExecutorRecord != null;
  const currentExecutorCommandLineReadable =
    typeof currentExecutorRecord?.CommandLine === 'string'
      && currentExecutorRecord.CommandLine.trim() !== '';
  const processInspectionSucceeded = processResult?.status === 0
    && processResult?.signal == null
    && protocolValid
    && parseError == null
    && duplicatePids.length === 0
    && currentExecutorPresent
    && currentExecutorCommandLineReadable
    && cleanupSucceeded;
  const processInspectionError = processInspectionSucceeded
    ? null
    : {
      status: processResult?.status ?? null,
      signal: processResult?.signal ?? null,
      spawnError: processResult?.error?.message || null,
      protocolValid,
      parseError,
      duplicatePids: duplicatePids.map((item) => item.ProcessId),
      currentExecutorPresent,
      currentExecutorCommandLineReadable,
      cleanupSucceeded,
    };
  const otherNodeProcesses = processInspectionSucceeded
    ? parsedProcesses.filter((item) => item.ProcessId !== process.pid)
    : [];
  const unreadableNodeProcesses = otherNodeProcesses.filter((item) =>
    typeof item.CommandLine !== 'string' || item.CommandLine.trim() === '');
  const activeC34Runners = processInspectionSucceeded
    ? otherNodeProcesses.filter((item) =>
      /(?:^|[\s"'])commit5r1c34-execute\.mjs(?:$|[\s"'])|[\\/]+commit5r1c34-execute\.mjs(?:$|[\s"'])/i
        .test(item.CommandLine || ''))
    : [];
  const uiOrToolingNodeProcesses = processInspectionSucceeded
    ? otherNodeProcesses.filter((item) =>
      !activeC34Runners.includes(item)
      && /(?:vscode|visual studio code|extensionhost|extension-host|codex)/i
        .test(item.CommandLine || ''))
    : [];
  const unrelatedNodeProcesses = processInspectionSucceeded
    ? otherNodeProcesses.filter((item) =>
      !activeC34Runners.includes(item) && !uiOrToolingNodeProcesses.includes(item))
    : [];
  const netstat = spawnSync('netstat', ['-ano', '-p', 'TCP'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30000,
    windowsHide: true,
  });
  const listeners5173 = (netstat.stdout || '').split(/\r?\n/).flatMap((line) => {
      const fields = line.trim().split(/\s+/);
      const matches = fields[0]?.toUpperCase() === 'TCP'
        && /:5173$/i.test(fields[1] || '')
        && fields[3]?.toUpperCase() === 'LISTENING';
      if (!matches) return [];
      const ownerPid = Number(fields[4]);
      const owner = parsedProcesses.find((item) => item.ProcessId === ownerPid) || null;
      return [{
        line: line.trim(),
        ownerPid: Number.isInteger(ownerPid) ? ownerPid : null,
        ownerClassification: owner == null
          ? 'OTHER_OR_UNKNOWN'
          : activeC34Runners.some((item) => item.ProcessId === ownerPid)
            ? 'ACTIVE_C34'
            : 'UNRELATED_NODE',
      }];
    });
  const activeC34RunnerCount = processInspectionSucceeded ? activeC34Runners.length : null;
  const inspectionClassification = !processInspectionSucceeded
    ? 'PROCESS_INSPECTION_FAILURE_INDETERMINATE'
    : activeC34Runners.length > 0
      ? 'ACTIVE_C34_PROCESS'
      : otherNodeProcesses.length > 0
        ? 'NO_ACTIVE_C34_WITH_UNRELATED_NODE'
        : 'NO_ACTIVE_C34_PROCESS';
  return {
    inspectionMethod:
      'Windows Script Host WMI node.exe inventory with strict sentinels, current-PID completeness proof, command-line classification, and independent netstat ownership',
    currentExecutorPid: process.pid,
    processInspectionStatus: processResult?.status ?? null,
    processInspectionSignal: processResult?.signal ?? null,
    processInspectionSucceeded,
    processInspectionError,
    processInspectionStderr: (processResult?.stderr || '').trim(),
    currentExecutorPresent,
    currentExecutorCommandLineReadable,
    cleanupSucceeded,
    inspectionClassification,
    otherNodeProcesses,
    unreadableNodeProcesses,
    allNodeCommandLinesReadable:
      processInspectionSucceeded && unreadableNodeProcesses.length === 0,
    activeC34Runners,
    activeC34RunnerCount,
    uiOrToolingNodeProcesses,
    unrelatedNodeProcesses,
    uiStateInterpretation: !processInspectionSucceeded
      ? 'UNKNOWN_FAIL_CLOSED'
      : activeC34Runners.length > 0
        ? 'OS_PROCESS_INVENTORY_CONFIRMS_ACTIVE_C34'
        : 'ANY_VS_CODE_OR_CODEX_RUNNING_C34_INDICATOR_IS_STALE_OR_NON_AUTHORITATIVE',
    netstatInspectionStatus: netstat.status,
    netstatInspectionSignal: netstat.signal,
    netstatInspectionStderr: (netstat.stderr || '').trim(),
    listeners5173,
    port5173Free: netstat.status === 0 && netstat.signal == null && listeners5173.length === 0,
  };
}

function validateC33Manifest() {
  const lines = fs.readFileSync(C33_MANIFEST, 'utf8').split(/\r?\n/).filter(Boolean);
  const rows = lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    C.requirePass(match, `C34_C33_MANIFEST_BAD_LINE_${line}`);
    const file = abs(match[2]);
    const exists = fs.existsSync(file);
    const actualSha256 = exists ? C.sha(fs.readFileSync(file)) : null;
    return {
      path: match[2],
      expectedSha256: match[1],
      actualSha256,
      exists,
      pass: exists && actualSha256 === match[1],
    };
  });
  return {
    unit: UNIT,
    generatedUtc: C.now(),
    manifest: C.rel(C33_MANIFEST),
    expectedEntries: 190,
    entries: rows.length,
    badHashes: rows.filter((row) => !row.pass),
    pass: rows.length === 190 && rows.every((row) => row.pass),
  };
}

function suiteIdentityFreeze() {
  const suitePaths = [
    L.R3_PATH,
    L.REASON_SUITE,
    L.COLLISION_PROBES,
    L.RELATION_SUITE,
    L.CLAUSE_PROBES,
    ...L.SUITES.map(([, file]) => file),
  ];
  const records = [...new Set(suitePaths)].sort().map(hashRecord);
  return {
    unit: UNIT,
    generatedUtc: C.now(),
    records,
    r3ExpectedSha256: L.R3_SHA,
    r3ActualSha256: records.find((record) => record.path === L.R3_PATH)?.sha256,
    pass: records.find((record) => record.path === L.R3_PATH)?.sha256 === L.R3_SHA,
  };
}

function preflight() {
  const head = git('rev-parse', 'HEAD').trim();
  const parent = git('rev-parse', 'HEAD^').trim();
  const branch = git('branch', '--show-current').trim();
  const upstream = git('rev-parse', '@{u}').trim();
  const sync = git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim();
  const trackedDiff = git('diff', '--name-only', 'HEAD').trim();
  const stagedDiff = git('diff', '--cached', '--name-only').trim();
  const status = git('status', '--porcelain=v1', '--untracked-files=all');
  const untracked = status.split(/\r?\n/).filter((line) => line.startsWith('?? '))
    .map((line) => line.slice(3));
  const unauthorizedUntracked = untracked.filter((file) =>
    !file.startsWith('.claude/')
    && !file.startsWith('.vscode/')
    && !file.startsWith('evaluation/factcheck/')
    && !file.startsWith('evaluation/results/phase-10a14-r20/COMMIT_5R1C34_')
    && !file.startsWith('evaluation/runner/phase-10a14-r20/commit5r1c34-'));
  const processes = processAndPortState();
  const registry = C.readJson(REGISTRY);
  const accountTransfer = fs.existsSync(ACCOUNT_TRANSFER_CONTINUITY)
    ? C.readJson(ACCOUNT_TRANSFER_CONTINUITY)
    : null;
  const preallocation = fs.existsSync(PREALLOCATION_VALIDATION)
    ? C.readJson(PREALLOCATION_VALIDATION)
    : null;
  const runnerHashes = {
    [C.RUNNER]: C.sha(fs.readFileSync(C.RUNNER)),
    'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs':
      C.sha(fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs')),
  };
  const currentBlob = git('rev-parse', `HEAD:${CURRENT_STATE}`).trim();
  const roadmapBlob = git('rev-parse', `HEAD:${ROADMAP}`).trim();
  const roadmapNorm = C.sha(C.norm(fs.readFileSync(ROADMAP)));
  const roadmapLegacyDiffs = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ROADMAP,
    'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
    'knowledge/TINA_Updated_Roadmap_v7.md',
  ).trim();
  const result = {
    unit: UNIT,
    generatedUtc: C.now(),
    head,
    expectedHead: C.START_HEAD,
    parent,
    expectedParent: C.EXPECTED_PARENT,
    branch,
    expectedBranch: 'feature/source-availability-engine-v1',
    upstream,
    sync,
    trackedDiff,
    stagedDiff,
    roadmapLegacyDiffs,
    currentStateGitBlob: currentBlob,
    expectedCurrentStateGitBlob: STARTING_CURRENT_BLOB,
    roadmapV9GitBlob: roadmapBlob,
    expectedRoadmapV9GitBlob: STARTING_ROADMAP_BLOB,
    roadmapV9NormalizedLfSha256: roadmapNorm,
    expectedRoadmapV9NormalizedLfSha256: STARTING_ROADMAP_NORM,
    registry: {
      totalAttempts: registry.attempts.length,
      cumulativeThrough: registry.cumulativeThrough,
      orphan: registry.summary.orphan,
      dangling: registry.summary.dangling,
      attemptsSha256: C.sha(Buffer.from(JSON.stringify(registry.attempts))),
    },
    processAndPortState: processes,
    accountTransfer: {
      exists: accountTransfer != null,
      classification: accountTransfer?.classification || null,
      safeToResume: accountTransfer?.safeToResume === true,
    },
    preallocation: {
      exists: preallocation != null,
      decision: preallocation?.decision || null,
      pass: preallocation?.pass === true,
      runnerHashes,
      recordedRunnerHashes: preallocation?.runnerHashes || null,
      runnerHashesMatch:
        JSON.stringify(preallocation?.runnerHashes || null) === JSON.stringify(runnerHashes),
    },
    gitIndexLockExists: fs.existsSync(path.join(C.REPO, '.git', 'index.lock')),
    untracked,
    unauthorizedUntracked,
    externalR0Snapshot: RECOVERY_SNAPSHOT,
    externalR0SnapshotExists: fs.existsSync(RECOVERY_SNAPSHOT),
  };
  result.pass = head === C.START_HEAD
    && parent === C.EXPECTED_PARENT
    && branch === 'feature/source-availability-engine-v1'
    && upstream === C.START_HEAD
    && sync === '0\t0'
    && trackedDiff === ''
    && stagedDiff === ''
    && roadmapLegacyDiffs === ''
    && currentBlob === STARTING_CURRENT_BLOB
    && roadmapBlob === STARTING_ROADMAP_BLOB
    && roadmapNorm === STARTING_ROADMAP_NORM
    && registry.attempts.length === 218
    && registry.cumulativeThrough === 'commit5r1c33-incomplete'
    && registry.summary.orphan === 0
    && registry.summary.dangling === 0
    && !result.gitIndexLockExists
    && processes.processInspectionStatus === 0
    && processes.processInspectionSucceeded
    && processes.allNodeCommandLinesReadable
    && processes.activeC34RunnerCount === 0
    && processes.netstatInspectionStatus === 0
    && processes.port5173Free
    && result.accountTransfer.exists
    && result.accountTransfer.classification === 'ACCOUNT_TRANSFER_PRE_ATTEMPT_CONTINUATION'
    && result.accountTransfer.safeToResume
    && result.preallocation.exists
    && result.preallocation.decision === 'PASS_READY_FOR_FIRST_ATTEMPT'
    && result.preallocation.pass
    && result.preallocation.runnerHashesMatch
    && unauthorizedUntracked.length === 0
    && result.externalR0SnapshotExists;
  C.requirePass(result.pass, `C34_PREFLIGHT_FAILED_${JSON.stringify(result)}`);
  return result;
}

function directoryInventory(directory) {
  const root = path.resolve(directory);
  const records = C.recursiveFiles(root)
    .map((file) => {
      const bytes = fs.readFileSync(file);
      return {
        path: path.relative(root, file).replace(/\\/g, '/'),
        bytes: bytes.length,
        sha256: C.sha(bytes),
      };
    })
    .sort((first, second) => first.path.localeCompare(second.path));
  return {
    root: C.rel(root),
    fileCount: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    combinedSha256: C.sha(Buffer.from(JSON.stringify(records))),
    records,
  };
}

function readJsonAllowBom(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function verifyExternalTechnicalRecoverySnapshot() {
  const root = path.resolve(TECHNICAL_RECOVERY_SNAPSHOT);
  const inventoryPath = path.join(root, 'HASH_INVENTORY.json');
  const metadataPath = path.join(root, 'SNAPSHOT_METADATA.json');
  const failedExecutePath = path.join(root, 'FAILED_RUN_EXECUTE.mjs');
  const failedLibPath = path.join(root, 'FAILED_RUN_LIB.mjs');
  for (const file of [
    inventoryPath,
    metadataPath,
    failedExecutePath,
    failedLibPath,
  ]) {
    C.requirePass(fs.existsSync(file), `C34_TECHNICAL_FREEZE_FILE_MISSING_${file}`);
  }
  const inventoryBytes = fs.readFileSync(inventoryPath);
  const metadataBytes = fs.readFileSync(metadataPath);
  const failedExecuteBytes = fs.readFileSync(failedExecutePath);
  const failedLibBytes = fs.readFileSync(failedLibPath);
  const inventory = readJsonAllowBom(inventoryPath);
  const metadata = readJsonAllowBom(metadataPath);
  const expectedSnapshotFiles = [
    'HASH_INVENTORY.json',
    ...(inventory.files || []).map((record) => record.path),
  ].sort();
  const actualSnapshotFiles = C.recursiveFiles(root)
    .map((file) => path.relative(root, file).replace(/\\/g, '/'))
    .sort();
  const unlistedSnapshotFiles = actualSnapshotFiles.filter((file) =>
    !expectedSnapshotFiles.includes(file));
  const missingSnapshotFiles = expectedSnapshotFiles.filter((file) =>
    !actualSnapshotFiles.includes(file));
  const verifiedFiles = [];
  for (const record of inventory.files || []) {
    const resolved = path.resolve(root, record.path);
    C.requirePass(
      resolved.startsWith(`${root}${path.sep}`),
      `C34_TECHNICAL_FREEZE_PATH_ESCAPE_${record.path}`,
    );
    C.requirePass(fs.existsSync(resolved), `C34_TECHNICAL_FREEZE_RECORD_MISSING_${record.path}`);
    const bytes = fs.readFileSync(resolved);
    verifiedFiles.push({
      path: record.path,
      bytes: bytes.length,
      sha256: C.sha(bytes),
      pass: bytes.length === record.bytes && C.sha(bytes) === record.sha256,
    });
  }
  const inventorySha256 = C.sha(inventoryBytes);
  const metadataSha256 = C.sha(metadataBytes);
  const failedExecuteSha256 = C.sha(failedExecuteBytes);
  const failedLibSha256 = C.sha(failedLibBytes);
  const result = {
    snapshot: TECHNICAL_RECOVERY_SNAPSHOT,
    classification: metadata.classification,
    inventorySha256,
    expectedInventorySha256: TECHNICAL_RECOVERY_SNAPSHOT_INVENTORY_SHA256,
    metadataSha256,
    expectedMetadataSha256: TECHNICAL_RECOVERY_SNAPSHOT_METADATA_SHA256,
    inventoryFileCount: inventory.fileCount,
    verifiedFileCount: verifiedFiles.length,
    inventoryTotalBytes: inventory.totalBytes,
    verifiedTotalBytes: verifiedFiles.reduce((sum, record) => sum + record.bytes, 0),
    failedRunRunnerRecovery: metadata.failedRunRunnerRecovery,
    failedExecuteSha256,
    expectedFailedExecuteSha256: FAILED_RUN_EXECUTE_SHA256,
    failedLibSha256,
    expectedFailedLibSha256: FAILED_RUN_LIB_SHA256,
    failedRunnerProvenance:
      'Reconstructed by reversing only known post-failure edits; accepted because both exact byte hashes equal immutable preallocation hashes.',
    expectedSnapshotFiles: expectedSnapshotFiles.length,
    actualSnapshotFiles: actualSnapshotFiles.length,
    unlistedSnapshotFiles,
    missingSnapshotFiles,
    failedRecords: verifiedFiles.filter((record) => !record.pass),
  };
  result.pass = inventorySha256 === TECHNICAL_RECOVERY_SNAPSHOT_INVENTORY_SHA256
    && metadataSha256 === TECHNICAL_RECOVERY_SNAPSHOT_METADATA_SHA256
    && inventory.fileCount === verifiedFiles.length
    && inventory.totalBytes === result.verifiedTotalBytes
    && verifiedFiles.every((record) => record.pass)
    && unlistedSnapshotFiles.length === 0
    && missingSnapshotFiles.length === 0
    && metadata.classification === 'IMMUTABLE_POST_TECHNICAL_FAILURE_PRE_LINKED_RETRY_FREEZE'
    && metadata.failedRunRunnerRecovery?.method
      === 'reversed only the known post-failure header-validator and linked-retry scaffolding edits from preserved partial working copies'
    && metadata.failedRunRunnerRecovery?.executeMatchesImmutablePreallocationHash === true
    && metadata.failedRunRunnerRecovery?.libMatchesImmutablePreallocationHash === true
    && failedExecuteSha256 === FAILED_RUN_EXECUTE_SHA256
    && failedLibSha256 === FAILED_RUN_LIB_SHA256;
  C.requirePass(result.pass, `C34_TECHNICAL_FREEZE_INVALID_${JSON.stringify(result)}`);
  return result;
}

function legacyTechnicalRecoveryPreflight() {
  C.requirePass(
    fs.existsSync(TECHNICAL_RECOVERY_ADJUDICATION),
    'C34_TECHNICAL_RECOVERY_ADJUDICATION_MISSING',
  );
  C.requirePass(
    fs.existsSync(TECHNICAL_RECOVERY_PREALLOCATION),
    'C34_TECHNICAL_RECOVERY_PREALLOCATION_MISSING',
  );
  const adjudication = C.readJson(TECHNICAL_RECOVERY_ADJUDICATION);
  const validation = C.readJson(TECHNICAL_RECOVERY_PREALLOCATION);
  const originalPreflight = C.readJson(artifact('PREFLIGHT.json'));
  const originalAccountTransferPreallocation = C.readJson(
    artifact('ACCOUNT_TRANSFER_PREALLOCATION_VALIDATION.json'),
  );
  const checkpointState = C.readJson(RECOVERY_CHECKPOINT);
  const registry = C.readJson(REGISTRY);
  const processes = processAndPortState();
  const externalTechnicalFreeze = verifyExternalTechnicalRecoverySnapshot();
  const devFactoryBaseline = C.readJson(artifact('DEV_FACTORY_PREEXISTING_STATE.json'));
  const devFactoryCurrent = devFactoryState('technical-recovery-preallocation');
  const originalProtectedResidueBaseline = C.readJson(
    artifact('PROTECTED_RESIDUE_BASELINE.json'),
  );
  const protectedResidueBaseline =
    validation.protectedResidueContinuity?.recoveryBaseline;
  C.requirePass(
    protectedResidueBaseline?.fileRecords,
    'C34_TECHNICAL_RECOVERY_PROTECTED_RESIDUE_BASELINE_MISSING',
  );
  const protectedResidueCurrent = protectedResidue('technical-recovery-preallocation');
  const devFactoryUnchanged = devFactoryBaseline.head === devFactoryCurrent.head
    && devFactoryBaseline.statusSha256 === devFactoryCurrent.statusSha256
    && devFactoryBaseline.trackedDiffSha256 === devFactoryCurrent.trackedDiffSha256;
  const protectedResidueUnchanged =
    protectedResidueKey(protectedResidueBaseline)
      === protectedResidueKey(protectedResidueCurrent);
  const originalProtectedResiduePreserved =
    originalProtectedResidueBaseline.fileRecords.every((original) =>
      protectedResidueCurrent.fileRecords.some((current) =>
        current.path === original.path
          && current.bytes === original.bytes
          && current.sha256 === original.sha256));
  const additionalProtectedFiles =
    validation.protectedResidueContinuity?.additionalProtectedFiles || [];
  const expectedRecoveryProtectedPaths = [
    ...originalProtectedResidueBaseline.fileRecords.map((record) => record.path),
    ...additionalProtectedFiles.map((record) => record.path),
  ].sort();
  const recoveryBaselineProtectedPaths = protectedResidueBaseline.fileRecords
    .map((record) => record.path)
    .sort();
  const reconstructId = validation.lineage?.reconstructionAttemptId;
  const technicalId = validation.lineage?.technicalAttemptId;
  const expectedTopLevelArtifacts =
    validation.integrity?.expectedPreRetryC34TopLevelArtifacts || [];
  const actualTopLevelArtifacts = fs.readdirSync(C.RES, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('COMMIT_5R1C34_'))
    .map((entry) => entry.name)
    .sort();
  const expectedAttemptPrefixes = [reconstructId, technicalId]
    .filter(Boolean)
    .map((attemptId) =>
      `evaluation/results/phase-10a14-r20/attempts/${attemptId}/`);
  const runnerHashes = {
    [C.RUNNER]: C.sha(fs.readFileSync(C.RUNNER)),
    'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs':
      C.sha(fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs')),
  };
  const head = git('rev-parse', 'HEAD').trim();
  const branch = git('symbolic-ref', '--short', 'HEAD').trim();
  const upstream = git('rev-parse', '@{u}').trim();
  const sync = git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim();
  const trackedDiff = git('diff', '--name-only', 'HEAD').trim().split(/\r?\n/).filter(Boolean);
  const stagedDiff = git('diff', '--cached', '--name-only').trim()
    .split(/\r?\n/).filter(Boolean);
  const serviceDiff = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ...L.SERVICES.map((name) => `services/${name}`),
  ).trim();
  const oracleDiff = git('diff', '--name-only', 'HEAD', '--', 'evaluation/oracles').trim();
  const knowledgeGuardDiff = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ROADMAP,
    CURRENT_STATE,
    'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
    'knowledge/TINA_Updated_Roadmap_v7.md',
  ).trim();
  const status = git('status', '--porcelain=v1', '--untracked-files=all');
  const unauthorizedUntracked = status.split(/\r?\n/)
    .filter((line) => line.startsWith('?? '))
    .map((line) => line.slice(3))
    .filter((file) => {
      const protectedPreexisting = file.startsWith('.claude/')
        || file.startsWith('.vscode/')
        || file.startsWith('evaluation/factcheck/');
      const exactRunner = [
        'evaluation/runner/phase-10a14-r20/commit5r1c34-execute.mjs',
        'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs',
      ].includes(file);
      const exactTopLevelArtifact = expectedTopLevelArtifacts
        .map((name) => `evaluation/results/phase-10a14-r20/${name}`)
        .includes(file);
      const exactAttemptTree = expectedAttemptPrefixes.some((prefix) =>
        file.startsWith(prefix));
      return !protectedPreexisting
        && !exactRunner
        && !exactTopLevelArtifact
        && !exactAttemptTree;
    });
  const c34Records = registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-'));
  const reconstructRecord = c34Records.find((attempt) => attempt.attemptId === reconstructId);
  const technicalRecord = c34Records.find((attempt) => attempt.attemptId === technicalId);
  const attemptDirectories = fs.readdirSync(C.ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  const reconstructDirectory = reconstructId ? path.join(C.ATT, reconstructId) : null;
  const technicalDirectory = technicalId ? path.join(C.ATT, technicalId) : null;
  const reconstructInventory = reconstructDirectory && fs.existsSync(reconstructDirectory)
    ? directoryInventory(reconstructDirectory)
    : null;
  const technicalInventory = technicalDirectory && fs.existsSync(technicalDirectory)
    ? directoryInventory(technicalDirectory)
    : null;
  const reconstructResult = reconstructDirectory
    && fs.existsSync(path.join(reconstructDirectory, 'ITERATION_RESULT.json'))
    ? C.readJson(path.join(reconstructDirectory, 'ITERATION_RESULT.json'))
    : null;
  const technicalFailure = technicalDirectory
    && fs.existsSync(path.join(technicalDirectory, 'TECHNICAL_FAILURE.json'))
    ? C.readJson(path.join(technicalDirectory, 'TECHNICAL_FAILURE.json'))
    : null;
  const technicalReplay = technicalDirectory
    && fs.existsSync(path.join(technicalDirectory, 'C34_CANDIDATE_DELTA_REPLAY.json'))
    ? C.readJson(path.join(technicalDirectory, 'C34_CANDIDATE_DELTA_REPLAY.json'))
    : null;
  const technicalSemanticEvidence = [
    'ITERATION_RESULT.json',
    'FROZEN_GATES.json',
    'ROW_LEVEL_PARETO.json',
    'M01R_AND_PRIOR_PRESERVATION.json',
    'GENERALIZATION_QUERY_RESULTS.json',
    'LEAVE_ONE_FAMILY_OUT.json',
    'SENTINEL_SHUFFLE_TAINT.json',
    'MONOTONIC_FEATURE_ABLATION.json',
    'PRECEDENCE_TRACE.json',
    'FULL_HEAD_DIFF.patch',
  ].filter((name) => technicalDirectory && fs.existsSync(path.join(technicalDirectory, name)));
  const registryPrefixSha256 = C.sha(
    Buffer.from(JSON.stringify(registry.attempts.slice(0, 218))),
  );
  const registryC34Sha256 = C.sha(Buffer.from(JSON.stringify(c34Records)));
  const walSha256 = C.sha(fs.readFileSync(artifact('ATTEMPT_ALLOCATION_WAL.ndjson')));
  const checkpointSha256 = C.sha(fs.readFileSync(RECOVERY_CHECKPOINT));
  const checkpointLogSha256 = C.sha(fs.readFileSync(RECOVERY_CHECKPOINT_LOG));
  const technicalBlockerSha256 = C.sha(fs.readFileSync(artifact('TECHNICAL_BLOCKER.json')));
  const adjudicationSha256 = C.sha(fs.readFileSync(TECHNICAL_RECOVERY_ADJUDICATION));
  const validationSha256 = C.sha(fs.readFileSync(TECHNICAL_RECOVERY_PREALLOCATION));
  const prerequisiteArtifactSha256 = Object.fromEntries(
    TECHNICAL_RECOVERY_PREREQUISITE_ARTIFACTS
      .map((name) => [name, C.sha(fs.readFileSync(artifact(name)))]),
  );
  const originalPreflightSha256 = C.sha(fs.readFileSync(artifact('PREFLIGHT.json')));
  const originalAccountTransferPreallocationSha256 = C.sha(
    fs.readFileSync(artifact('ACCOUNT_TRANSFER_PREALLOCATION_VALIDATION.json')),
  );
  const forbiddenFinalizationArtifacts = [
    'TECHNICAL_RECOVERY_PREFLIGHT.json',
    'RULE_GENERALIZATION_PACKETS.json',
    'CANDIDATE_EXHAUSTION.json',
    'SERVICE_RESTORATION.json',
    'PRE_REVIEW_EXECUTION_REPORT.json',
    'PRE_REVIEW_EVIDENCE_MANIFEST.sha256',
    'REVIEW_BINDING_SPEC.json',
    'REVIEWED_STATE_INVENTORY.json',
    'INDEPENDENT_REVIEW.json',
    'FINAL_EXECUTION_REPORT.json',
    'EVIDENCE_MANIFEST.sha256',
  ].filter((name) => fs.existsSync(artifact(name)));
  const result = {
    unit: UNIT,
    generatedUtc: C.now(),
    mode: 'LINKED_TECHNICAL_RETRY_PREFLIGHT',
    head,
    branch,
    upstream,
    sync,
    trackedDiff,
    stagedDiff,
    serviceDiff,
    oracleDiff,
    knowledgeGuardDiff,
    unauthorizedUntracked,
    processAndPortState: processes,
    devFactoryContinuity: {
      baseline: devFactoryBaseline,
      current: devFactoryCurrent,
      unchanged: devFactoryUnchanged,
    },
    protectedResidueContinuity: {
      classification:
        validation.protectedResidueContinuity?.classification,
      originalBaselineKeySha256:
        C.sha(Buffer.from(protectedResidueKey(originalProtectedResidueBaseline))),
      baselineKeySha256: C.sha(Buffer.from(protectedResidueKey(protectedResidueBaseline))),
      currentKeySha256: C.sha(Buffer.from(protectedResidueKey(protectedResidueCurrent))),
      originalBaselinePreserved: originalProtectedResiduePreserved,
      expectedRecoveryProtectedPaths,
      recoveryBaselineProtectedPaths,
      unchanged: protectedResidueUnchanged,
    },
    gitIndexLockExists: fs.existsSync(path.join(C.REPO, '.git', 'index.lock')),
    validation: {
      decision: validation.decision,
      pass: validation.pass === true,
      runnerHashes,
      recordedRunnerHashes: validation.runnerHashes,
      runnerHashesMatch:
        JSON.stringify(validation.runnerHashes) === JSON.stringify(runnerHashes),
      forensicAdjudicationSha256: adjudicationSha256,
      recordedForensicAdjudicationSha256: validation.forensicAdjudicationSha256,
      artifactSha256: validationSha256,
      enforcedValidationGates: {
        syntaxValidation: validation.syntaxValidation,
        staticAudit: validation.staticAudit,
        noAllocationNoMutationAudit: validation.noAllocationNoMutationAudit,
        fullHeadPatchRegression: validation.fullHeadPatchRegression,
        linkedRetryPathAudit: validation.linkedRetryPathAudit,
        nt01Identity: validation.nt01Identity,
        reviewCutoverAudit: validation.reviewCutoverAudit,
        changeScopeAudit: validation.changeScopeAudit,
      },
    },
    lineage: {
      reconstructId,
      technicalId,
      attemptDirectories,
      reconstructStatus: reconstructRecord?.status || null,
      technicalStatus: technicalRecord?.status || null,
      technicalRetryOf: technicalRecord?.retryOf ?? null,
      existingLinkedRetries: c34Records
        .filter((attempt) => attempt.retryOf === technicalId)
        .map((attempt) => attempt.attemptId),
    },
    registry: {
      totalAttempts: registry.attempts.length,
      cumulativeThrough: registry.cumulativeThrough,
      selectedSemanticRuntime: registry.selectedSemanticRuntime,
      orphan: registry.summary.orphan,
      dangling: registry.summary.dangling,
      running: registry.summary.c34RunningAttemptIds,
      technicalFailures: registry.summary.c34TechnicalFailureAttemptIds,
      prefix218Sha256: registryPrefixSha256,
      expectedPrefix218Sha256: originalPreflight.registry.attemptsSha256,
      c34Sha256: registryC34Sha256,
    },
    evidenceIntegrity: {
      reconstructInventory,
      technicalInventory,
      registrySha256: C.sha(fs.readFileSync(REGISTRY)),
      walSha256,
      checkpointSha256,
      checkpointLogSha256,
      technicalBlockerSha256,
      prerequisiteArtifactSha256,
      originalPreflightSha256,
      originalAccountTransferPreallocationSha256,
      expectedTopLevelArtifacts,
      actualTopLevelArtifacts,
      forbiddenFinalizationArtifacts,
      technicalSemanticEvidence,
      externalTechnicalFreeze,
    },
    checkpoint: checkpointState,
    adjudication: {
      classification: adjudication.classification,
      semanticGatesReached: adjudication.semanticGatesReached,
      linkedRetryAuthorized: adjudication.linkedRetryAuthorized,
    },
  };
  result.pass = head === C.START_HEAD
    && branch === EXPECTED_BRANCH
    && upstream === C.START_HEAD
    && sync === '0\t0'
    && JSON.stringify(trackedDiff) === JSON.stringify([C.rel(REGISTRY)])
    && stagedDiff.length === 0
    && serviceDiff === ''
    && oracleDiff === ''
    && knowledgeGuardDiff === ''
    && unauthorizedUntracked.length === 0
    && devFactoryUnchanged
    && validation.protectedResidueContinuity?.classification
      === 'APPEND_ONLY_TECHNICAL_RECOVERY_PROTECTED_RESIDUE_BASELINE'
    && additionalProtectedFiles.length === 1
    && additionalProtectedFiles[0]?.path
      === '.claude/settings.local.json'
    && additionalProtectedFiles[0]?.bytes === 4466
    && additionalProtectedFiles[0]?.sha256
      === '9b3fd5a5c9361a737605b6738b76e486e1a2c7ca5479b65f39f35cb96778a9dc'
    && protectedResidueBaseline.fileRecords.length
      === originalProtectedResidueBaseline.fileRecords.length + 1
    && JSON.stringify(recoveryBaselineProtectedPaths)
      === JSON.stringify(expectedRecoveryProtectedPaths)
    && protectedResidueBaseline.fileRecords.some((record) =>
      record.path === additionalProtectedFiles[0].path
        && record.bytes === additionalProtectedFiles[0].bytes
        && record.sha256 === additionalProtectedFiles[0].sha256)
    && originalProtectedResiduePreserved
    && protectedResidueUnchanged
    && !result.gitIndexLockExists
    && processes.processInspectionStatus === 0
    && processes.processInspectionSucceeded
    && processes.allNodeCommandLinesReadable
    && processes.activeC34RunnerCount === 0
    && processes.netstatInspectionStatus === 0
    && processes.port5173Free
    && validation.decision === 'PASS_READY_FOR_LINKED_NT01_RETRY'
    && validation.pass === true
    && validation.syntaxValidation?.libraryExitCode === 0
    && validation.syntaxValidation?.executorExitCode === 0
    && validation.syntaxValidation?.pass === true
    && validation.staticAudit?.exitCode === 0
    && validation.staticAudit?.hypotheses === 18
    && validation.staticAudit?.protectedQueryCount === 5387
    && validation.staticAudit?.finalReasonPassed === 3576
    && validation.staticAudit?.pass === true
    && validation.noAllocationNoMutationAudit?.registryTotalAttempts === 220
    && validation.noAllocationNoMutationAudit?.c34RegistryRecords === 2
    && validation.noAllocationNoMutationAudit?.c34AttemptDirectories === 2
    && validation.noAllocationNoMutationAudit?.serviceDiffEmpty === true
    && validation.noAllocationNoMutationAudit?.stagingEmpty === true
    && validation.noAllocationNoMutationAudit?.pass === true
    && validation.fullHeadPatchRegression?.candidateOnlyPatchSha256
      === '5a0d260cee26a4e5da344fad5ab4044d8d59b1912ab90d79f625c7937cb29696'
    && validation.fullHeadPatchRegression?.fullHeadPatchSha256
      === 'b41b2b0f69d9d73bbb0a5d3397378109862d97157cb3bac0cfcbe7721f3a1b4f'
    && validation.fullHeadPatchRegression?.benignForbiddenBodyLiteralsAccepted === true
    && validation.fullHeadPatchRegression?.hostileForbiddenHeaderRejected === true
    && validation.fullHeadPatchRegression?.pass === true
    && validation.linkedRetryPathAudit?.retryOf === technicalId
    && validation.linkedRetryPathAudit?.cycle === 'nt01-retry01'
    && validation.linkedRetryPathAudit?.retryReason
      === 'C34_FULL_HEAD_PATCH_INVALID_BEFORE_SEMANTIC_GATE_EXECUTION'
    && validation.linkedRetryPathAudit?.componentSafe === true
    && validation.linkedRetryPathAudit?.singleRetryOnly === true
    && validation.linkedRetryPathAudit?.pass === true
    && validation.nt01Identity?.servicesTreeDigest
      === '02d53a0480db28aebbb47568aab5700a80ed502bb65c072eb2ebfff9d5a60129'
    && validation.nt01Identity?.candidatePatchSha256
      === '5a0d260cee26a4e5da344fad5ab4044d8d59b1912ab90d79f625c7937cb29696'
    && validation.nt01Identity?.analyzerRawSha256
      === '817f709dc9ebde79dbe73293130a88207af2d4e40e2213eef28ec54b5392a30b'
    && validation.nt01Identity?.analyzerBytes === 180812
    && validation.nt01Identity?.pass === true
    && validation.reviewCutoverAudit?.exactModel === 'claude-opus-4-8'
    && validation.reviewCutoverAudit?.exactlyOneReview === true
    && validation.reviewCutoverAudit?.stagingDeferredUntilApproval === true
    && validation.reviewCutoverAudit?.pass === true
    && validation.changeScopeAudit?.candidateDefinitionsChanged === false
    && validation.changeScopeAudit?.serviceFilesChanged === false
    && validation.changeScopeAudit?.headerValidatorAndRecoveryOnly === true
    && validation.changeScopeAudit?.pass === true
    && result.validation.runnerHashesMatch
    && adjudicationSha256 === validation.forensicAdjudicationSha256
    && adjudication.classification === 'TECHNICAL_INCOMPLETE_PRE_SEMANTIC'
    && adjudication.semanticGatesReached === false
    && adjudication.failurePoint
      === 'AFTER_CANDIDATE_ONLY_REPLAY_BEFORE_DIRECT_R3_FROZEN_QUERY_LEVEL_SEMANTIC_GATES'
    && adjudication.linkedRetryAuthorized === true
    && adjudication.externalTechnicalFreeze?.inventorySha256
      === TECHNICAL_RECOVERY_SNAPSHOT_INVENTORY_SHA256
    && adjudication.externalTechnicalFreeze?.metadataSha256
      === TECHNICAL_RECOVERY_SNAPSHOT_METADATA_SHA256
    && adjudication.externalTechnicalFreeze?.failedExecuteSha256 === FAILED_RUN_EXECUTE_SHA256
    && adjudication.externalTechnicalFreeze?.failedLibSha256 === FAILED_RUN_LIB_SHA256
    && externalTechnicalFreeze.pass
    && externalTechnicalFreeze.inventorySha256
      === validation.externalTechnicalFreeze?.inventorySha256
    && externalTechnicalFreeze.metadataSha256
      === validation.externalTechnicalFreeze?.metadataSha256
    && externalTechnicalFreeze.failedExecuteSha256
      === validation.externalTechnicalFreeze?.failedExecuteSha256
    && externalTechnicalFreeze.failedLibSha256
      === validation.externalTechnicalFreeze?.failedLibSha256
    && originalPreflight.preallocation?.recordedRunnerHashes?.[C.RUNNER]
      === FAILED_RUN_EXECUTE_SHA256
    && originalPreflight.preallocation?.recordedRunnerHashes
      ?.['evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs']
      === FAILED_RUN_LIB_SHA256
    && originalAccountTransferPreallocation.runnerHashes?.[C.RUNNER]
      === FAILED_RUN_EXECUTE_SHA256
    && originalAccountTransferPreallocation.runnerHashes
      ?.['evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs']
      === FAILED_RUN_LIB_SHA256
    && registry.attempts.length === 220
    && registry.cumulativeThrough === 'commit5r1c34-in-progress'
    && registry.summary.orphan === 0
    && registry.summary.dangling === 0
    && registry.summary.c34RunningAttemptIds.length === 0
    && JSON.stringify(registry.summary.c34TechnicalFailureAttemptIds)
      === JSON.stringify([technicalId])
    && registry.selectedSemanticRuntime?.attemptId === C.SELECTED_C33_ATTEMPT
    && registry.selectedSemanticRuntime?.identity?.servicesTreeDigest
      === C.C33_IDENTITY.servicesTreeDigest
    && registryPrefixSha256 === originalPreflight.registry.attemptsSha256
    && registryPrefixSha256 === validation.integrity.registryPrefix218Sha256
    && registryC34Sha256 === validation.integrity.registryC34Sha256
    && c34Records.length === 2
    && attemptDirectories.length === 2
    && JSON.stringify(attemptDirectories)
      === JSON.stringify([reconstructId, technicalId].sort())
    && reconstructRecord?.status === 'completed'
    && reconstructRecord?.disposition === 'RECONSTRUCTED_EXACT_C33_SELECTED_RUNTIME'
    && reconstructRecord?.cycle === 'reconstruct'
    && technicalRecord?.status === 'technical_failure'
    && technicalRecord?.disposition === 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE'
    && technicalRecord?.cycle === 'nt01'
    && technicalRecord?.attemptCategory === 'domain_campaign'
    && technicalRecord?.gateName === GATE_NAME
    && technicalRecord?.attemptOrdinal === 1
    && technicalRecord?.exitCode === 1
    && technicalRecord?.controlling === true
    && technicalRecord?.retryOf == null
    && technicalRecord?.retryReason == null
    && technicalRecord?.semanticBase?.attemptId === reconstructId
    && technicalRecord?.semanticBase?.servicesTreeDigest
      === C.C33_IDENTITY.servicesTreeDigest
    && technicalRecord?.semanticBase?.reasonPassed === 3504
    && JSON.stringify(technicalRecord?.resultPaths) === JSON.stringify([
      C.rel(path.join(technicalDirectory, 'TECHNICAL_FAILURE.json')),
    ])
    && c34Records.every((attempt) => attempt.retryOf !== technicalId)
    && reconstructResult?.pass === true
    && reconstructResult?.identity?.servicesTreeDigest === C.C33_IDENTITY.servicesTreeDigest
    && technicalFailure?.classification === 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE'
    && technicalFailure?.semanticDisposition === 'NOT_A_SEMANTIC_REJECTION'
    && technicalFailure?.recoverableOnlyByNewLinkedAttempt === true
    && technicalReplay?.pass === true
    && technicalReplay?.temporaryRootRemoved === true
    && technicalReplay?.canonicalPatch?.sha256
      === validation.integrity.technicalCandidatePatchSha256
    && technicalRecord?.runtimeTreeDigest
      === validation.integrity.technicalCandidateRuntimeTreeDigest
    && technicalRecord?.runtimeTreeDigest === validation.nt01Identity.servicesTreeDigest
    && technicalRecord?.runtimeRawBlobs?.['services/philippine-tax-intent-analyzer.js']
      === validation.nt01Identity.analyzerRawSha256
    && technicalRecord?.runtimeBytes?.['services/philippine-tax-intent-analyzer.js']
      === validation.nt01Identity.analyzerBytes
    && technicalSemanticEvidence.length === 0
    && reconstructInventory?.combinedSha256
      === validation.integrity.reconstructionAttemptInventorySha256
    && technicalInventory?.combinedSha256
      === validation.integrity.technicalAttemptInventorySha256
    && C.sha(fs.readFileSync(REGISTRY)) === validation.integrity.registrySha256
    && walSha256 === validation.integrity.walSha256
    && checkpointSha256 === validation.integrity.checkpointSha256
    && checkpointLogSha256 === validation.integrity.checkpointLogSha256
    && technicalBlockerSha256 === validation.integrity.technicalBlockerSha256
    && JSON.stringify(prerequisiteArtifactSha256)
      === JSON.stringify(validation.integrity.prerequisiteArtifactSha256)
    && originalPreflightSha256 === validation.integrity.originalPreflightSha256
    && originalAccountTransferPreallocationSha256
      === validation.integrity.originalAccountTransferPreallocationSha256
    && JSON.stringify(actualTopLevelArtifacts)
      === JSON.stringify(expectedTopLevelArtifacts)
    && checkpointState.status === 'BLOCKED_TECHNICAL_INCOMPLETE'
    && checkpointState.blocker === 'C34_FULL_HEAD_PATCH_INVALID'
    && forbiddenFinalizationArtifacts.length === 0;
  C.requirePass(result.pass, `C34_TECHNICAL_RECOVERY_PREFLIGHT_FAILED_${JSON.stringify(result)}`);
  return { result, validation, registry, originalPreflight };
}

function validateCheckpointChain() {
  const bytes = fs.readFileSync(RECOVERY_CHECKPOINT_LOG);
  const lines = bytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  const legacyStages = [
    'R0 forensic capture',
    'R1 process adjudication',
    'R2 commit-state determination',
    'R3 local-state classification',
    'R4 crash evidence',
    'account transfer pre-attempt continuity',
    'account transfer handoff verification',
    'account transfer syntax validation',
    'account transfer static shadow audit',
    'account transfer leakage and dependency audit',
    'account transfer attempt path and runtime metadata audit',
    'account transfer isolated replay self-test',
    'account transfer review cutover audit',
    'account transfer preallocation validation',
  ];
  const legacyPrefixBytes = Buffer.from(`${lines.slice(0, legacyStages.length).join('\n')}\n`);
  const legacyPrefixSha256 = C.sha(legacyPrefixBytes);
  let prior = Buffer.alloc(0);
  const records = lines.map((line, index) => {
    const event = JSON.parse(line);
    const legacy = index < legacyStages.length;
    const { eventSha256, ...withoutHash } = event;
    const actualEventSha256 = C.sha(Buffer.from(JSON.stringify(withoutHash)));
    const actualPreviousLogSha256 = C.sha(prior);
    const record = {
      ordinal: legacy ? index + 1 : event.ordinal,
      expectedOrdinal: index + 1,
      stage: event.stage,
      status: event.status,
      blocker: event.blocker,
      schema: legacy ? 'LEGACY_APPEND_ONLY_V1' : `V${event.schemaVersion}`,
      eventSha256,
      actualEventSha256,
      previousLogSha256: event.previousLogSha256,
      actualPreviousLogSha256,
      pass: legacy
        ? event.stage === legacyStages[index]
          && event.status != null
          && event.schemaVersion == null
          && event.ordinal == null
          && event.eventSha256 == null
          && event.previousLogSha256 == null
        : event.schemaVersion === 2
          && event.ordinal === index + 1
          && eventSha256 === actualEventSha256
          && event.previousLogSha256 === actualPreviousLogSha256,
    };
    prior = Buffer.concat([prior, Buffer.from(`${line}\n`)]);
    return record;
  });
  return {
    path: C.rel(RECOVERY_CHECKPOINT_LOG),
    rows: records.length,
    sha256: C.sha(bytes),
    legacyPrefixRows: legacyStages.length,
    legacyPrefixSha256,
    expectedLegacyPrefixSha256:
      'bc7295532ba0c3f855afe3c033e8cbee821c1cf5633cac65f2e3878f630832f7',
    records,
    pass: legacyPrefixSha256
      === 'bc7295532ba0c3f855afe3c033e8cbee821c1cf5633cac65f2e3878f630832f7'
      && records.every((record) => record.pass),
  };
}

function frozenNt01Integrity({ allowRecoveryArtifact = false } = {}) {
  const frozenInventoryPath = path.join(
    FULL_HEAD_PATCH_BLOCKER_FREEZE,
    'NT01_COMPLETE_ATTEMPT_INVENTORY.json',
  );
  C.requirePass(
    fs.existsSync(frozenInventoryPath),
    'C34_FULL_HEAD_BLOCKER_FREEZE_NT01_INVENTORY_MISSING',
  );
  const frozen = readJsonAllowBom(frozenInventoryPath);
  const directory = path.join(C.ATT, ORIGINAL_NT01_ATTEMPT);
  const current = C.recursiveFiles(directory)
    .map((file) => {
      const bytes = fs.readFileSync(file);
      return {
        relativePath: path.relative(directory, file).replace(/\\/g, '/'),
        length: bytes.length,
        sha256: C.sha(bytes),
      };
    })
    .sort((first, second) => first.relativePath.localeCompare(second.relativePath));
  const frozenComparable = frozen
    .map((record) => ({
      relativePath: record.relativePath,
      length: record.length,
      sha256: record.sha256,
    }))
    .sort((first, second) => first.relativePath.localeCompare(second.relativePath));
  const preserved = frozenComparable.map((record) => {
    const actual = current.find((item) => item.relativePath === record.relativePath);
    return {
      ...record,
      actual: actual || null,
      pass: actual?.length === record.length && actual?.sha256 === record.sha256,
    };
  });
  const additions = current.filter((record) =>
    !frozenComparable.some((frozenRecord) => frozenRecord.relativePath === record.relativePath));
  const allowedAdditions = allowRecoveryArtifact
    ? ['EXECUTOR_TECHNICAL_STOP_RECOVERY.json']
    : [];
  return {
    freeze: FULL_HEAD_PATCH_BLOCKER_FREEZE,
    frozenInventoryPath: frozenInventoryPath.replace(/\\/g, '/'),
    frozenFileCount: frozenComparable.length,
    currentFileCount: current.length,
    preserved,
    additions,
    allowedAdditions,
    pass: preserved.every((record) => record.pass)
      && JSON.stringify(additions.map((record) => record.relativePath))
        === JSON.stringify(allowedAdditions),
  };
}

function patchAdditionGroups(text) {
  const groups = [];
  let current = [];
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('@@')) {
      if (current.length) groups.push(current);
      current = [];
    } else if (line.startsWith('+') && !line.startsWith('+++') && line.slice(1).trim()) {
      current.push(line.trimEnd());
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function runFullHeadPatchRecoverySelfTests() {
  const registryBeforeSha256 = C.sha(fs.readFileSync(REGISTRY));
  const walPath = artifact('ATTEMPT_ALLOCATION_WAL.ndjson');
  const walBeforeSha256 = C.sha(fs.readFileSync(walPath));
  const checkpointBeforeSha256 = C.sha(fs.readFileSync(RECOVERY_CHECKPOINT_LOG));
  const attemptDirectoriesBefore = fs.readdirSync(C.ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  const frozenNt01Before = frozenNt01Integrity();
  const serviceDiffBefore = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ...L.SERVICES.map((name) => `services/${name}`),
  ).trim();
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'tina-c34-full-head-patch-recovery-self-test-'),
  );
  const base = path.join(temporaryRoot, 'm01r');
  const candidate = path.join(temporaryRoot, 'nt01');
  const head = path.join(temporaryRoot, 'head');
  let result;
  try {
    const baseIdentity = C.reconstructCommittedSnapshot(base);
    const candidateIdentity = C.materializeCandidate(base, candidate, [CANDIDATES[0].block]);
    fs.mkdirSync(head);
    for (const name of L.SERVICES) {
      fs.writeFileSync(
        path.join(head, name),
        C.gitShowBuffer(C.START_HEAD, `services/${name}`),
      );
    }
    const headIdentity = C.runtimeFor(head);
    const candidateOnlyPatch = C.canonicalPatch(base, candidate);
    const fullHeadPatchResult = C.canonicalPatch(head, candidate);
    const inheritedHeadToBasePatch = C.canonicalPatch(head, base);
    const candidateOnlyReplay = C.dualEnvironmentReplay(
      base,
      candidate,
      candidateOnlyPatch,
      'candidate_only_recovery_self_test',
      { identityPolicy: 'exact_raw_all', throwOnFailure: false },
    );
    const fullHeadReplay = C.dualEnvironmentReplay(
      head,
      candidate,
      fullHeadPatchResult,
      'full_head_recovery_self_test',
      {
        identityPolicy: 'normalized_all_changed_raw_exact',
        throwOnFailure: false,
      },
    );
    const candidateGroups = patchAdditionGroups(candidateOnlyPatch.text);
    const inheritedGroups = patchAdditionGroups(inheritedHeadToBasePatch.text);
    const unexpectedInheritedCandidateGroups = candidateGroups.filter((candidateGroup) =>
      inheritedGroups.some((inheritedGroup) =>
        candidateGroup.every((line) => inheritedGroup.includes(line))));
    const bodyForbiddenPattern =
      /(?:[A-Za-z]:[\\/]|evaluation\/results\/|runtime-snapshot|attempts\/|\\\\)/i;
    const benignBodyMatches = fullHeadPatchResult.text.replace(/\r\n/g, '\n').split('\n')
      .map((line, index) => ({ lineNumber: index + 1, text: line }))
      .filter((record) =>
        !/^(diff --git |--- |\+\+\+ )/.test(record.text)
          && bodyForbiddenPattern.test(record.text));
    const expectedFile = 'services/philippine-tax-intent-analyzer.js';
    const expectedOldHeader = `--- a/${expectedFile}`;
    const expectedNewHeader = `+++ b/${expectedFile}`;
    const hostileHeaderText = fullHeadPatchResult.text.replace(
      expectedOldHeader,
      '--- C:/Projects/tina-backend/services/philippine-tax-intent-analyzer.js',
    );
    const missingHeaderText = fullHeadPatchResult.text.replace(`${expectedOldHeader}\n`, '');
    const malformedHeaderText = fullHeadPatchResult.text.replace(
      expectedNewHeader,
      '+++ b/services/../philippine-tax-intent-analyzer.js',
    );
    const extraHeaderText =
      `diff --git a/services/unexpected.js b/services/unexpected.js\n`
      + `--- a/services/unexpected.js\n`
      + `+++ b/services/unexpected.js\n`
      + `@@ -1 +1 @@\n-old\n+new\n`
      + fullHeadPatchResult.text;
    const headerValidation = {
      fullHeadCanonical: C.validateCanonicalPatchHeaders(
        fullHeadPatchResult.text,
        fullHeadPatchResult.changedFiles,
      ),
      candidateOnlyCanonical: C.validateCanonicalPatchHeaders(
        candidateOnlyPatch.text,
        candidateOnlyPatch.changedFiles,
      ),
      hostileAbsoluteHeader: C.validateCanonicalPatchHeaders(
        hostileHeaderText,
        fullHeadPatchResult.changedFiles,
      ),
      missingHeader: C.validateCanonicalPatchHeaders(
        missingHeaderText,
        fullHeadPatchResult.changedFiles,
      ),
      malformedTraversalHeader: C.validateCanonicalPatchHeaders(
        malformedHeaderText,
        fullHeadPatchResult.changedFiles,
      ),
      extraDiffBlock: C.validateCanonicalPatchHeaders(
        extraHeaderText,
        fullHeadPatchResult.changedFiles,
      ),
      benignBodyMatches,
    };
    const emptyPatch = C.canonicalPatch(base, base);
    const rawDivergences = fullHeadReplay.environments.map((environment) => ({
      environment: environment.environment,
      files: L.SERVICES.map((name) => {
        const key = `services/${name}`;
        return {
          path: key,
          changedByPatch: fullHeadPatchResult.changedFiles.includes(key),
          forwardRawSha256: environment.postForwardHashes[key].rawSha256,
          expectedCandidateRawSha256:
            environment.expectedCandidateIdentity[key].rawSha256,
          normalizedLfSha256:
            environment.postForwardHashes[key].normalizedLfSha256,
          expectedCandidateNormalizedLfSha256:
            environment.expectedCandidateIdentity[key].normalizedLfSha256,
          rawMatch: environment.postForwardHashes[key].rawSha256
            === environment.expectedCandidateIdentity[key].rawSha256,
          normalizedMatch: environment.postForwardHashes[key].normalizedLfSha256
            === environment.expectedCandidateIdentity[key].normalizedLfSha256,
        };
      }).filter((record) => !record.rawMatch),
    }));
    const predecessorRecord = C.readJson(
      path.join(C.ATT, ORIGINAL_NT01_ATTEMPT, 'ATTEMPT.json'),
    );
    const predecessorReplay = C.readJson(
      path.join(C.ATT, ORIGINAL_NT01_ATTEMPT, 'C34_CANDIDATE_DELTA_REPLAY.json'),
    );
    const testA = {
      name: 'reconstruct exact M01R from HEAD committed snapshot blobs',
      identity: baseIdentity,
      expectedIdentity: C.C33_IDENTITY,
      pass: C.sameRuntime(baseIdentity, C.C33_IDENTITY),
    };
    const testB = {
      name: 'candidate-only patch',
      patch: { ...candidateOnlyPatch, text: undefined },
      replay: candidateOnlyReplay,
      candidateIdentity,
      predecessorRuntimeTreeDigest: predecessorRecord.runtimeTreeDigest,
      predecessorCandidatePatchSha256: predecessorReplay.canonicalPatch.sha256,
      inheritedHeadToBasePatch: { ...inheritedHeadToBasePatch, text: undefined },
      computedInheritedChangeExclusion: {
        candidateAdditionGroups: candidateGroups,
        inheritedAdditionGroups: inheritedGroups,
        unexpectedInheritedCandidateGroups,
        pass: unexpectedInheritedCandidateGroups.length === 0,
      },
      pass: candidateOnlyPatch.pass
        && candidateOnlyPatch.sha256
          === '5a0d260cee26a4e5da344fad5ab4044d8d59b1912ab90d79f625c7937cb29696'
        && candidateOnlyPatch.sha256 === predecessorReplay.canonicalPatch.sha256
        && candidateIdentity.servicesTreeDigest === predecessorRecord.runtimeTreeDigest
        && candidateOnlyReplay.identityPolicy === 'exact_raw_all'
        && candidateOnlyReplay.environments.every((environment) =>
          environment.forwardRawHashMatchAll)
        && candidateOnlyReplay.pass
        && unexpectedInheritedCandidateGroups.length === 0,
    };
    const allowedUnchangedRawDivergence = rawDivergences.every((environment) =>
      environment.files.every((record) =>
        !record.changedByPatch && record.normalizedMatch));
    const testC = {
      name: 'full-HEAD candidate patch',
      headIdentity,
      candidateIdentity,
      patch: { ...fullHeadPatchResult, text: undefined },
      replay: fullHeadReplay,
      rawDivergences,
      identityPolicy:
        'Exact normalized identity for every service plus exact raw identity for every patch-changed service. Normalized-unchanged HEAD files retain HEAD LF bytes rather than candidate snapshot CRLF bytes.',
      allowedUnchangedRawDivergence,
      pass: fullHeadPatchResult.pass
        && fullHeadPatchResult.sha256
          === 'b41b2b0f69d9d73bbb0a5d3397378109862d97157cb3bac0cfcbe7721f3a1b4f'
        && JSON.stringify(fullHeadPatchResult.changedFiles)
          === JSON.stringify([expectedFile])
        && fullHeadReplay.identityPolicy === 'normalized_all_changed_raw_exact'
        && fullHeadReplay.pass
        && fullHeadReplay.skippedPatchCount === 0
        && fullHeadReplay.noOpCount === 0
        && fullHeadReplay.unexpectedFileCount === 0
        && fullHeadReplay.environments.every((environment) =>
          environment.forwardNormalizedHashMatch
            && environment.changedFileRawIdentityMatch
            && environment.forwardServicesTreeMatch
            && environment.reversePass)
        && allowedUnchangedRawDivergence,
    };
    const headerPass = headerValidation.fullHeadCanonical.pass
      && headerValidation.candidateOnlyCanonical.pass
      && benignBodyMatches.length > 0
      && !headerValidation.hostileAbsoluteHeader.pass
      && headerValidation.hostileAbsoluteHeader.hasForbiddenPath
      && !headerValidation.missingHeader.pass
      && !headerValidation.malformedTraversalHeader.pass
      && !headerValidation.extraDiffBlock.pass
      && emptyPatch.changedFiles.length === 0
      && emptyPatch.pass === false;
    const testD = {
      name: 'dual environment',
      candidateOnlyEnvironments:
        candidateOnlyReplay.environments.map((environment) => environment.environment),
      fullHeadEnvironments:
        fullHeadReplay.environments.map((environment) => environment.environment),
      pass: candidateOnlyReplay.environments.length === 2
        && fullHeadReplay.environments.length === 2
        && candidateOnlyReplay.pass
        && fullHeadReplay.pass,
    };
    result = {
      unit: UNIT,
      generatedUtc: C.now(),
      purpose:
        'No-allocation blocker-recovery self-test for the exact original NT01 rule and exact C33 M01R semantic base.',
      testA,
      testB,
      testC,
      testD,
      headerValidation,
      emptyPatch: { ...emptyPatch, text: undefined },
      expectedChangedFiles: [expectedFile],
      candidateOnlyAndFullHeadSeparated:
        candidateOnlyPatch.sha256 !== fullHeadPatchResult.sha256
        && candidateOnlyPatch.bytes < fullHeadPatchResult.bytes,
      registryBeforeSha256,
      walBeforeSha256,
      checkpointBeforeSha256,
      attemptDirectoriesBefore,
      frozenNt01Before,
      serviceDiffBefore,
      temporaryRoot: temporaryRoot.replace(/\\/g, '/'),
      temporaryRootRemoved: false,
      semanticGatesExecuted: false,
      attemptAllocated: false,
      headerPass,
      pass: false,
    };
  } finally {
    removeOwnedTemp(temporaryRoot, 'tina-c34-full-head-patch-recovery-self-test-');
  }
  result.temporaryRootRemoved = !fs.existsSync(temporaryRoot);
  result.registryAfterSha256 = C.sha(fs.readFileSync(REGISTRY));
  result.walAfterSha256 = C.sha(fs.readFileSync(walPath));
  result.checkpointAfterSha256 = C.sha(fs.readFileSync(RECOVERY_CHECKPOINT_LOG));
  result.attemptDirectoriesAfter = fs.readdirSync(C.ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  result.frozenNt01After = frozenNt01Integrity();
  result.serviceDiffAfter = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ...L.SERVICES.map((name) => `services/${name}`),
  ).trim();
  result.noAllocationOrGovernedStateMutation =
    result.registryBeforeSha256 === result.registryAfterSha256
    && result.walBeforeSha256 === result.walAfterSha256
    && result.checkpointBeforeSha256 === result.checkpointAfterSha256
    && JSON.stringify(result.attemptDirectoriesBefore)
      === JSON.stringify(result.attemptDirectoriesAfter)
    && result.frozenNt01Before.pass
    && result.frozenNt01After.pass
    && result.serviceDiffBefore === ''
    && result.serviceDiffAfter === '';
  result.pass = result.testA.pass
    && result.testB.pass
    && result.testC.pass
    && result.testD.pass
    && result.headerPass
    && result.candidateOnlyAndFullHeadSeparated
    && result.temporaryRootRemoved
    && result.noAllocationOrGovernedStateMutation;
  return result;
}

function prepareFullHeadPatchBlockerRecovery() {
  C.requirePass(
    !fs.existsSync(artifact('FULL_HEAD_PATCH_BLOCKER_ROOT_CAUSE.json')),
    'C34_BLOCKER_RECOVERY_ALREADY_PREPARED',
  );
  const checkpointStateBefore = C.readJson(RECOVERY_CHECKPOINT);
  const checkpointChainBefore = validateCheckpointChain();
  const registryBefore = C.readJson(REGISTRY);
  const ledgerBefore = C.reconcileC34AttemptLedger();
  const startingProcesses = processAndPortState();
  C.requirePass(
    git('rev-parse', 'HEAD').trim() === C.START_HEAD
      && git('symbolic-ref', '--short', 'HEAD').trim() === EXPECTED_BRANCH
      && git('rev-parse', '@{u}').trim() === C.START_HEAD
      && git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim() === '0\t0'
      && git('diff', '--cached', '--name-only').trim() === ''
      && git(
        'diff',
        '--name-only',
        'HEAD',
        '--',
        ...L.SERVICES.map((name) => `services/${name}`),
      ).trim() === ''
      && !fs.existsSync(path.join(C.REPO, '.git', 'index.lock'))
      && startingProcesses.processInspectionStatus === 0
      && startingProcesses.processInspectionSucceeded
      && startingProcesses.allNodeCommandLinesReadable
      && startingProcesses.activeC34RunnerCount === 0
      && startingProcesses.netstatInspectionStatus === 0
      && startingProcesses.port5173Free,
    'C34_BLOCKER_RECOVERY_STARTING_ENVIRONMENT_INVALID',
  );
  C.requirePass(
    checkpointStateBefore.ordinal === 20
      && checkpointStateBefore.status === 'BLOCKED_TECHNICAL_INCOMPLETE'
      && checkpointChainBefore.pass
      && checkpointChainBefore.rows === 20
      && checkpointChainBefore.records.slice(18).every((record) =>
        record.pass
          && record.stage === 'executor technical stop'
          && record.status === 'BLOCKED_TECHNICAL_INCOMPLETE'
          && /^C34_CANDIDATE_ONLY_RECOVERY_SELF_TEST_PATCH_INVALID/.test(record.blocker || '')),
    'C34_BLOCKER_RECOVERY_STARTING_CHECKPOINT_INVALID',
  );
  C.requirePass(
    ledgerBefore.pass
      && registryBefore.attempts.length === 220
      && !registryBefore.attempts.some((attempt) => attempt.retryOf === ORIGINAL_NT01_ATTEMPT),
    'C34_BLOCKER_RECOVERY_STARTING_LEDGER_INVALID',
  );
  const selfTests = runFullHeadPatchRecoverySelfTests();
  C.requirePass(
    selfTests.pass,
    `C34_FULL_HEAD_PATCH_RECOVERY_SELF_TEST_FAILED_${JSON.stringify(selfTests)}`,
  );
  const generatedUtc = C.now();
  const technicalDirectory = path.join(C.ATT, ORIGINAL_NT01_ATTEMPT);
  const technicalRecord = C.readJson(path.join(technicalDirectory, 'ATTEMPT.json'));
  const technicalFailure = C.readJson(path.join(technicalDirectory, 'TECHNICAL_FAILURE.json'));
  const originalReplay = C.readJson(
    path.join(technicalDirectory, 'C34_CANDIDATE_DELTA_REPLAY.json'),
  );
  const externalTechnicalFreeze = verifyExternalTechnicalRecoverySnapshot();
  const bodyMatches = selfTests.headerValidation.benignBodyMatches;
  const rootCause = {
    unit: UNIT,
    generatedUtc,
    blocker: 'C34_FULL_HEAD_PATCH_INVALID',
    determination: 'FULL_HEAD_PATCH_VALIDATION_FALSE_POSITIVE',
    effectiveTechnicalDisposition: 'TECHNICAL_INCOMPLETE_EXECUTOR_STOP',
    rootCause:
      'The failed canonicalPatch validator applied a forbidden-path regular expression to the entire generated patch text. The full HEAD-to-NT01 patch was non-empty, canonical, repository-relative, and byte-stable, but harmless inherited source lines containing evaluation/results/ and escaped regular-expression backslashes matched the body-wide scan.',
    notRootCauses: [
      'git diff --no-index failure: status 1 was the expected differences-emitted status',
      'absolute or quoted Windows path in a patch header',
      'path-length overflow',
      'invalid a/ or b/ canonical header prefix',
      'candidate snapshot mismatch',
      'semantic-base versus HEAD confusion',
      'missing inherited-diff handling',
      'empty or malformed patch',
      'unexpected changed-file set',
    ],
    failingExecution: {
      command: technicalRecord.command,
      args: technicalRecord.commandArgs,
      cwd: technicalRecord.environmentFingerprint.cwd,
      exitCode: technicalRecord.exitCode,
      signal: technicalRecord.signal,
      stdout: {
        path: technicalRecord.stdoutPath,
        bytes: fs.statSync(path.join(technicalDirectory, 'stdout.txt')).size,
        sha256: C.sha(fs.readFileSync(path.join(technicalDirectory, 'stdout.txt'))),
      },
      stderr: {
        path: technicalRecord.stderrPath,
        bytes: fs.statSync(path.join(technicalDirectory, 'stderr.txt')).size,
        sha256: C.sha(fs.readFileSync(path.join(technicalDirectory, 'stderr.txt'))),
      },
      stack: technicalFailure.error,
      failurePoint:
        'after candidate-only generation and dual replay; during full-HEAD header validation; before direct semantic gates',
    },
    failedValidator: {
      frozenLibrary:
        `${TECHNICAL_RECOVERY_SNAPSHOT}/FAILED_RUN_LIB.mjs`,
      frozenLibrarySha256: FAILED_RUN_LIB_SHA256,
      behavior:
        'forbidden.test(text) scanned headers, hunks, and context/source body together',
      bodyMatches,
      bodyMatchCount: bodyMatches.length,
    },
    candidateOnlyPatchStatus: {
      sha256: selfTests.testB.patch.sha256,
      bytes: selfTests.testB.patch.bytes,
      changedFiles: selfTests.testB.patch.changedFiles,
      canonicalHeaders: selfTests.testB.patch.canonicalHeaders,
      replayPass: selfTests.testB.replay.pass,
      originalReplayPass: originalReplay.pass,
    },
    fullHeadPatchStatus: {
      sha256: selfTests.testC.patch.sha256,
      bytes: selfTests.testC.patch.bytes,
      changedFiles: selfTests.testC.patch.changedFiles,
      canonicalHeaders: selfTests.testC.patch.canonicalHeaders,
      expectedHeaders: selfTests.testC.patch.expectedHeaders,
      headersValidAfterHeaderOnlyRemediation: selfTests.testC.patch.headersValid,
      replayPass: selfTests.testC.replay.pass,
      diffCommands: selfTests.testC.patch.diffCommands,
    },
    identities: {
      baseM01R: selfTests.testA.identity,
      candidateNt01: selfTests.testC.candidateIdentity,
      startingHead: selfTests.testC.headIdentity,
    },
    changedPaths: {
      expected: selfTests.expectedChangedFiles,
      candidateOnlyActual: selfTests.testB.patch.changedFiles,
      fullHeadActual: selfTests.testC.patch.changedFiles,
    },
    lineEndingNormalization: {
      policy: selfTests.testC.identityPolicy,
      rawDivergences: selfTests.testC.rawDivergences,
      pass: selfTests.testC.allowedUnchangedRawDivergence,
    },
    blockerFreeze: {
      path: FULL_HEAD_PATCH_BLOCKER_FREEZE,
      nt01Integrity: selfTests.frozenNt01Before,
    },
    remediationDevelopmentTechnicalStops: {
      checkpointOrdinals: [19, 20],
      classification:
        'APPEND_ONLY_NO_ALLOCATION_SELF_TEST_DIAGNOSTICS_PRESERVED_AFTER_HEADER_VALIDATOR_REPAIR',
      governedAttemptAllocated: false,
      registryWalOrServiceMutation: false,
      checkpointRowsPreserved: true,
    },
    externalTechnicalFreeze,
    semanticGatesReached: false,
    semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
    pass: true,
  };
  const rootCauseJson = artifact('FULL_HEAD_PATCH_BLOCKER_ROOT_CAUSE.json');
  const rootCauseMd = artifact('FULL_HEAD_PATCH_BLOCKER_ROOT_CAUSE.md');
  writeOnceJson(rootCauseJson, rootCause);
  writeOnceText(
    rootCauseMd,
    `# C34 full-HEAD patch blocker root cause

- Blocker: \`C34_FULL_HEAD_PATCH_INVALID\`
- Determination: **FULL_HEAD_PATCH_VALIDATION_FALSE_POSITIVE**
- Existing NT01 disposition: **TECHNICAL_INCOMPLETE_EXECUTOR_STOP**
- Semantic disposition: **NOT_A_SEMANTIC_REJECTION**

The full HEAD-to-NT01 patch was generated correctly: ${selfTests.testC.patch.bytes} bytes,
SHA-256 \`${selfTests.testC.patch.sha256}\`, with the exact one-file changed set and
canonical repository-relative headers. The internal \`git diff --no-index\` status
was 1, which means differences were emitted.

The failed runner then applied its forbidden-path expression to the entire patch
body. ${bodyMatches.length} harmless source/context lines matched
\`evaluation/results/\` or escaped JavaScript regular-expression backslashes.
No canonical header contained a forbidden path.

The remediation parses only structural header positions. Hostile, missing,
malformed, and extra headers fail closed. Candidate-only and full-HEAD patches
both replay forward and reverse in an isolated non-repository directory and an
isolated clean Git worktree with zero skipped patches, no-ops, or unexpected files.

The original terminal attempt remains immutable. It consumed one allocation and
no semantic result; the direct semantic gates were never reached.
`,
  );
  checkpoint({
    stage: 'root-cause determination',
    status: 'COMPLETED_VALIDATOR_FALSE_POSITIVE',
    activeBaseHash: C.C33_IDENTITY.servicesTreeDigest,
    attemptId: ORIGINAL_NT01_ATTEMPT,
    artifacts: [rootCauseJson, rootCauseMd],
    nextExactOperation:
      'Record the append-only NT01 technical disposition without rewriting original terminal evidence.',
    safeToResume: true,
  });
  const recoveryArtifact = path.join(
    technicalDirectory,
    'EXECUTOR_TECHNICAL_STOP_RECOVERY.json',
  );
  const recoveryRecord = {
    unit: UNIT,
    generatedUtc,
    originalAttemptId: ORIGINAL_NT01_ATTEMPT,
    historicStatus: technicalRecord.status,
    historicDisposition: technicalRecord.disposition,
    effectiveDisposition: 'TECHNICAL_INCOMPLETE_EXECUTOR_STOP',
    subcause: 'FULL_HEAD_PATCH_VALIDATION_FALSE_POSITIVE',
    blocker: 'C34_FULL_HEAD_PATCH_INVALID',
    semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
    semanticGatesReached: false,
    semanticResultExists: false,
    allocationConsumed: true,
    semanticResultConsumed: false,
    originalAttemptRecordPreserved: true,
    originalTechnicalFailurePreserved: true,
    originalTerminalWalEventPreserved: true,
    recoverableOnlyByNewLinkedAttempt: true,
    candidateOnlyPatchSha256: selfTests.testB.patch.sha256,
    candidateOnlyReplayPass: selfTests.testB.replay.pass,
    fullHeadPatchSha256: selfTests.testC.patch.sha256,
    rootCauseArtifact: C.rel(rootCauseJson),
    pass: true,
  };
  writeOnceJson(recoveryArtifact, recoveryRecord);
  const registryAdjudication = C.adjudicateTechnicalAttempt({
    attemptId: ORIGINAL_NT01_ATTEMPT,
    historicDisposition: 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE',
    effectiveDisposition: 'TECHNICAL_INCOMPLETE_EXECUTOR_STOP',
    blocker: 'C34_FULL_HEAD_PATCH_INVALID',
    semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
    recoveryArtifact,
    adjudicatedAt: generatedUtc,
  });
  const technicalAdjudication = {
    unit: UNIT,
    generatedUtc,
    classification: 'TECHNICAL_INCOMPLETE_EXECUTOR_STOP',
    subcause: 'FULL_HEAD_PATCH_VALIDATION_FALSE_POSITIVE',
    technicalAttemptId: ORIGINAL_NT01_ATTEMPT,
    reconstructionAttemptId: RECONSTRUCTION_ATTEMPT,
    historicAttemptEvidencePreserved: true,
    semanticGatesReached: false,
    semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
    failurePoint:
      'AFTER_CANDIDATE_ONLY_REPLAY_BEFORE_DIRECT_R3_FROZEN_QUERY_LEVEL_SEMANTIC_GATES',
    linkedRetryAuthorized: true,
    registryAndWalUpdate: registryAdjudication,
    recoveryArtifact: C.rel(recoveryArtifact),
    rootCauseArtifacts: [C.rel(rootCauseJson), C.rel(rootCauseMd)],
    externalTechnicalFreeze,
    pass: true,
  };
  writeOnceJson(TECHNICAL_RECOVERY_ADJUDICATION, technicalAdjudication);
  checkpoint({
    stage: 'nt01 technical disposition',
    status: 'TECHNICAL_INCOMPLETE_EXECUTOR_STOP_RECORDED_APPEND_ONLY',
    activeBaseHash: C.C33_IDENTITY.servicesTreeDigest,
    attemptId: ORIGINAL_NT01_ATTEMPT,
    artifacts: [
      recoveryArtifact,
      TECHNICAL_RECOVERY_ADJUDICATION,
      REGISTRY,
      artifact('ATTEMPT_ALLOCATION_WAL.ndjson'),
    ],
    nextExactOperation: 'Record the narrow header-validator remediation.',
    safeToResume: true,
  });
  const headerValidationPath = artifact('FULL_HEAD_PATCH_HEADER_VALIDATION.json');
  const headerValidationArtifact = {
    unit: UNIT,
    generatedUtc,
    scope: 'structural patch headers only; patch body is excluded from path validation',
    canonicalFullHead: selfTests.headerValidation.fullHeadCanonical,
    canonicalCandidateOnly: selfTests.headerValidation.candidateOnlyCanonical,
    benignForbiddenLookingBodyLiterals: bodyMatches,
    benignForbiddenLookingBodyLiteralsAccepted:
      selfTests.headerValidation.fullHeadCanonical.pass && bodyMatches.length > 0,
    hostileAbsoluteHeader: selfTests.headerValidation.hostileAbsoluteHeader,
    missingHeader: selfTests.headerValidation.missingHeader,
    malformedTraversalHeader: selfTests.headerValidation.malformedTraversalHeader,
    extraDiffBlock: selfTests.headerValidation.extraDiffBlock,
    emptyPatchRejected: selfTests.emptyPatch.pass === false
      && selfTests.emptyPatch.changedFiles.length === 0,
    pass: selfTests.headerPass,
  };
  writeOnceJson(headerValidationPath, headerValidationArtifact);
  const remediationPath = artifact('FULL_HEAD_PATCH_REMEDIATION_RESULT.json');
  const remediation = {
    unit: UNIT,
    generatedUtc,
    scope: 'full-HEAD patch generation/validation/replay path only',
    candidateSemanticRuleChanged: false,
    candidateDefinitionsChanged: false,
    serviceFilesChanged: false,
    remediation:
      'Parse and validate canonical diff/file headers structurally, reject forbidden paths only in those headers, retain body bytes untouched, and require explicit full-HEAD dual replay.',
    canonicalRepositoryRelativeHeaders: true,
    candidateOnlyAndFullHeadSeparated: selfTests.candidateOnlyAndFullHeadSeparated,
    inheritedM01rDifferencesIncluded: true,
    absoluteWindowsPathRejected: true,
    pathLengthDependent: false,
    exactChangedFileProof: selfTests.testC.patch.changedFiles,
    exactCandidateHashProof: selfTests.testC.candidateIdentity,
    computedInheritedChangeExclusion:
      selfTests.testB.computedInheritedChangeExclusion,
    forwardAndReverseReplay: true,
    skippedNoOpUnexpectedRejected: true,
    lineEndingPolicy: selfTests.testC.identityPolicy,
    headerValidationArtifact: C.rel(headerValidationPath),
    runnerHashes: {
      [C.RUNNER]: C.sha(fs.readFileSync(C.RUNNER)),
      'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs':
        C.sha(fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs')),
    },
    pass: selfTests.headerPass
      && selfTests.testB.pass
      && selfTests.testC.pass,
  };
  writeOnceJson(remediationPath, remediation);
  checkpoint({
    stage: 'patch remediation',
    status: 'COMPLETED_HEADER_ONLY_VALIDATION_AND_FULL_HEAD_REPLAY',
    activeBaseHash: C.C33_IDENTITY.servicesTreeDigest,
    attemptId: ORIGINAL_NT01_ATTEMPT,
    artifacts: [remediationPath, headerValidationPath, C.RUNNER,
      'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs'],
    nextExactOperation: 'Seal the no-allocation A-D repair self-test evidence.',
    safeToResume: true,
  });
  const replaySelfTestPath = artifact('FULL_HEAD_PATCH_REPLAY_SELF_TEST.json');
  writeOnceJson(replaySelfTestPath, selfTests);
  checkpoint({
    stage: 'self-tests',
    status: 'PASS_TESTS_A_B_C_D_DUAL_ENVIRONMENT',
    activeBaseHash: C.C33_IDENTITY.servicesTreeDigest,
    attemptId: ORIGINAL_NT01_ATTEMPT,
    artifacts: [replaySelfTestPath, headerValidationPath, remediationPath],
    nextExactOperation:
      'Authorize exactly one new linked retry with the required linkage and new ordinal.',
    safeToResume: true,
  });
  const authorizationPath = artifact('NT01_LINKED_RETRY_AUTHORIZATION.json');
  const authorization = {
    unit: UNIT,
    generatedUtc,
    authorized: true,
    authorizationScope: 'exactly one linked retry of the original NT01 candidate rule',
    retryOf: ORIGINAL_NT01_ATTEMPT,
    retryReason: 'C34_FULL_HEAD_PATCH_INVALID',
    retryType: 'TECHNICAL_LINKED_RETRY',
    cycle: 'nt01-retry01',
    semanticCandidateOrdinal: 1,
    newAttemptOrdinal: 2,
    originalAttemptIdReuseForbidden: true,
    exactSemanticBase: {
      attemptId: RECONSTRUCTION_ATTEMPT,
      servicesTreeDigest: C.C33_IDENTITY.servicesTreeDigest,
      reasonPassed: 3504,
    },
    exactCandidate: {
      candidateId: CANDIDATES[0].id,
      servicesTreeDigest: selfTests.testC.candidateIdentity.servicesTreeDigest,
      candidateOnlyPatchSha256: selfTests.testB.patch.sha256,
      fullHeadPatchSha256: selfTests.testC.patch.sha256,
    },
    prerequisites: {
      rootCausePass: rootCause.pass,
      dispositionPass: recoveryRecord.pass,
      remediationPass: remediation.pass,
      headerValidationPass: headerValidationArtifact.pass,
      selfTestsPass: selfTests.pass,
      registryAndWalAdjudicationPass: registryAdjudication.pass,
      noExistingRetry: !C.readJson(REGISTRY).attempts
        .some((attempt) => attempt.retryOf === ORIGINAL_NT01_ATTEMPT),
    },
  };
  authorization.pass = authorization.authorized
    && Object.values(authorization.prerequisites).every(Boolean);
  writeOnceJson(authorizationPath, authorization);
  C.requirePass(authorization.pass, 'C34_LINKED_RETRY_AUTHORIZATION_INVALID');
  const registryAfterAdjudication = C.readJson(REGISTRY);
  const protectedRecoveryBaseline = protectedResidue('full-head-patch-recovery-preallocation');
  const prerequisiteArtifactSha256 = Object.fromEntries(
    TECHNICAL_RECOVERY_PREREQUISITE_ARTIFACTS
      .map((name) => [name, C.sha(fs.readFileSync(artifact(name)))]),
  );
  const runnerHashes = {
    [C.RUNNER]: C.sha(fs.readFileSync(C.RUNNER)),
    'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs':
      C.sha(fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs')),
  };
  const preallocation = {
    unit: UNIT,
    generatedUtc,
    decision: 'PASS_READY_FOR_LINKED_NT01_RETRY',
    lineage: {
      reconstructionAttemptId: RECONSTRUCTION_ATTEMPT,
      technicalAttemptId: ORIGINAL_NT01_ATTEMPT,
    },
    runnerHashes,
    forensicAdjudicationSha256: C.sha(fs.readFileSync(TECHNICAL_RECOVERY_ADJUDICATION)),
    rootCauseSha256: C.sha(fs.readFileSync(rootCauseJson)),
    remediationSha256: C.sha(fs.readFileSync(remediationPath)),
    headerValidationSha256: C.sha(fs.readFileSync(headerValidationPath)),
    replaySelfTestSha256: C.sha(fs.readFileSync(replaySelfTestPath)),
    linkedRetryAuthorizationSha256: C.sha(fs.readFileSync(authorizationPath)),
    externalTechnicalFreeze,
    blockerFreeze: {
      path: FULL_HEAD_PATCH_BLOCKER_FREEZE,
      nt01FrozenIntegrity: frozenNt01Integrity({ allowRecoveryArtifact: true }),
    },
    protectedResidueContinuity: {
      classification: 'APPEND_ONLY_TECHNICAL_RECOVERY_PROTECTED_RESIDUE_BASELINE',
      recoveryBaseline: protectedRecoveryBaseline,
      additionalProtectedFiles: protectedRecoveryBaseline.fileRecords.filter((record) =>
        record.path === '.claude/settings.local.json'),
    },
    integrity: {
      registryPrefix218Sha256:
        C.sha(Buffer.from(JSON.stringify(registryAfterAdjudication.attempts.slice(0, 218)))),
      registryC34Sha256: C.sha(Buffer.from(JSON.stringify(
        registryAfterAdjudication.attempts.filter((attempt) =>
          attempt.attemptId.includes('commit5r1c34-')),
      ))),
      registrySha256: C.sha(fs.readFileSync(REGISTRY)),
      walSha256: C.sha(fs.readFileSync(artifact('ATTEMPT_ALLOCATION_WAL.ndjson'))),
      checkpointSha256: C.sha(fs.readFileSync(RECOVERY_CHECKPOINT)),
      checkpointLogSha256: C.sha(fs.readFileSync(RECOVERY_CHECKPOINT_LOG)),
      technicalBlockerSha256: C.sha(fs.readFileSync(artifact('TECHNICAL_BLOCKER.json'))),
      reconstructionAttemptInventorySha256:
        directoryInventory(path.join(C.ATT, RECONSTRUCTION_ATTEMPT)).combinedSha256,
      technicalAttemptInventorySha256:
        directoryInventory(path.join(C.ATT, ORIGINAL_NT01_ATTEMPT)).combinedSha256,
      technicalCandidatePatchSha256: selfTests.testB.patch.sha256,
      technicalCandidateRuntimeTreeDigest:
        selfTests.testC.candidateIdentity.servicesTreeDigest,
      prerequisiteArtifactSha256,
      originalPreflightSha256: C.sha(fs.readFileSync(artifact('PREFLIGHT.json'))),
      originalAccountTransferPreallocationSha256:
        C.sha(fs.readFileSync(artifact('ACCOUNT_TRANSFER_PREALLOCATION_VALIDATION.json'))),
    },
    fullHeadPatchRegression: {
      candidateOnlyPatchSha256: selfTests.testB.patch.sha256,
      fullHeadPatchSha256: selfTests.testC.patch.sha256,
      benignForbiddenBodyLiteralsAccepted:
        headerValidationArtifact.benignForbiddenLookingBodyLiteralsAccepted,
      hostileForbiddenHeaderRejected:
        !headerValidationArtifact.hostileAbsoluteHeader.pass,
      candidateOnlyDualReplayPass: selfTests.testB.replay.pass,
      fullHeadDualReplayPass: selfTests.testC.replay.pass,
      pass: remediation.pass && selfTests.pass,
    },
    linkedRetryPathAudit: {
      retryOf: ORIGINAL_NT01_ATTEMPT,
      retryReason: authorization.retryReason,
      retryType: authorization.retryType,
      cycle: authorization.cycle,
      semanticCandidateOrdinal: authorization.semanticCandidateOrdinal,
      attemptOrdinal: authorization.newAttemptOrdinal,
      componentSafe: true,
      singleRetryOnly: true,
      pass: authorization.pass,
    },
    nt01Identity: {
      servicesTreeDigest: selfTests.testC.candidateIdentity.servicesTreeDigest,
      candidatePatchSha256: selfTests.testB.patch.sha256,
      analyzerRawSha256:
        selfTests.testC.candidateIdentity['services/philippine-tax-intent-analyzer.js'].rawSha256,
      analyzerBytes:
        selfTests.testC.candidateIdentity['services/philippine-tax-intent-analyzer.js'].bytes,
      pass: selfTests.testB.pass && selfTests.testC.pass,
    },
    noAllocationNoMutationAudit: {
      registryTotalAttempts: registryAfterAdjudication.attempts.length,
      c34RegistryRecords: registryAfterAdjudication.attempts
        .filter((attempt) => attempt.attemptId.includes('commit5r1c34-')).length,
      c34AttemptDirectories: fs.readdirSync(C.ATT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-')).length,
      serviceDiffEmpty: git(
        'diff',
        '--name-only',
        'HEAD',
        '--',
        ...L.SERVICES.map((name) => `services/${name}`),
      ).trim() === '',
      stagingEmpty: git('diff', '--cached', '--name-only').trim() === '',
      pass: true,
    },
    changeScopeAudit: {
      candidateDefinitionsChanged: false,
      serviceFilesChanged: false,
      headerValidatorReplayAndRecoveryOnly: true,
      pass: true,
    },
    pass: false,
  };
  preallocation.noAllocationNoMutationAudit.pass =
    preallocation.noAllocationNoMutationAudit.registryTotalAttempts === 220
    && preallocation.noAllocationNoMutationAudit.c34RegistryRecords === 2
    && preallocation.noAllocationNoMutationAudit.c34AttemptDirectories === 2
    && preallocation.noAllocationNoMutationAudit.serviceDiffEmpty
    && preallocation.noAllocationNoMutationAudit.stagingEmpty;
  preallocation.pass = authorization.pass
    && selfTests.pass
    && remediation.pass
    && headerValidationArtifact.pass
    && preallocation.blockerFreeze.nt01FrozenIntegrity.pass
    && preallocation.fullHeadPatchRegression.pass
    && preallocation.linkedRetryPathAudit.pass
    && preallocation.nt01Identity.pass
    && preallocation.noAllocationNoMutationAudit.pass
    && preallocation.changeScopeAudit.pass;
  C.requirePass(preallocation.pass, 'C34_TECHNICAL_RECOVERY_PREALLOCATION_NOT_PASSING');
  writeOnceJson(TECHNICAL_RECOVERY_PREALLOCATION, preallocation);
  checkpoint({
    stage: 'linked retry authorization',
    status: 'PASS_READY_FOR_LINKED_NT01_RETRY',
    activeBaseHash: C.C33_IDENTITY.servicesTreeDigest,
    attemptId: ORIGINAL_NT01_ATTEMPT,
    artifacts: [
      authorizationPath,
      TECHNICAL_RECOVERY_PREALLOCATION,
      replaySelfTestPath,
      REGISTRY,
      artifact('ATTEMPT_ALLOCATION_WAL.ndjson'),
    ],
    nextExactOperation:
      'Run the technical recovery preflight, then allocate one new ord02 linked NT01 retry.',
    safeToResume: true,
  });
  const checkpointChainAfter = validateCheckpointChain();
  C.requirePass(
    checkpointChainAfter.pass && checkpointChainAfter.rows === 25,
    'C34_BLOCKER_RECOVERY_CHECKPOINT_CHAIN_INVALID',
  );
  const ledgerAfter = C.reconcileC34AttemptLedger();
  const result = {
    unit: UNIT,
    generatedUtc: C.now(),
    status: 'PASS_READY_FOR_LINKED_NT01_RETRY',
    rootCause: C.rel(rootCauseJson),
    disposition: C.rel(recoveryArtifact),
    remediation: C.rel(remediationPath),
    headerValidation: C.rel(headerValidationPath),
    replaySelfTest: C.rel(replaySelfTestPath),
    authorization: C.rel(authorizationPath),
    technicalAdjudication: C.rel(TECHNICAL_RECOVERY_ADJUDICATION),
    preallocation: C.rel(TECHNICAL_RECOVERY_PREALLOCATION),
    checkpointChain: checkpointChainAfter,
    ledger: ledgerAfter,
    pass: checkpointChainAfter.pass && ledgerAfter.pass,
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function readWalRows() {
  return fs.readFileSync(artifact('ATTEMPT_ALLOCATION_WAL.ndjson'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => ({ line: index + 1, ...JSON.parse(line) }));
}

function historicalCheckpoint27ManifestVerification() {
  const frozenRunner = path.join(
    TIMEBOX_CONTINUATION_SNAPSHOT,
    'evaluation__runner__phase-10a14-r20__commit5r1c34-execute.mjs',
  );
  const lines = fs.readFileSync(CHECKPOINT_27_SAFE_PAUSE_MANIFEST, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);
  const records = lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    C.requirePass(match, `C34_CHECKPOINT_27_MANIFEST_BAD_LINE_${line}`);
    const manifestPath = match[2];
    const mappedPath = manifestPath === C.RUNNER ? frozenRunner : path.resolve(manifestPath);
    const exists = fs.existsSync(mappedPath);
    const actualSha256 = exists ? C.sha(fs.readFileSync(mappedPath)) : null;
    return {
      path: manifestPath,
      mappedPath: manifestPath === C.RUNNER
        ? mappedPath.replace(/\\/g, '/')
        : manifestPath,
      expectedSha256: match[1],
      actualSha256,
      exists,
      pass: exists && actualSha256 === match[1],
    };
  });
  const result = {
    manifest: hashRecord(CHECKPOINT_27_SAFE_PAUSE_MANIFEST),
    entries: records.length,
    mappedHistoricalRunner: hashRecord(frozenRunner),
    badRecords: records.filter((record) => !record.pass),
    pass: false,
  };
  result.pass = result.manifest.sha256
      === 'cf1e30b35d4c9fff23d335f6d77c55e9dcccdde8bab2950f95649e2e41346f1e'
    && result.entries === 80
    && result.mappedHistoricalRunner.sha256 === TIMEBOX_PREVIOUS_RUNNER_SHA256
    && records.every((record) => record.pass);
  C.requirePass(result.pass, `C34_HISTORICAL_CHECKPOINT_27_MANIFEST_FAILED_${JSON.stringify(result)}`);
  return result;
}

function zeroRetryAllocationState() {
  const registry = C.readJson(REGISTRY);
  const walRows = readWalRows();
  const c34Attempts = registry.attempts.filter((attempt) =>
    attempt.attemptId.includes('commit5r1c34-'));
  const linkedRetries = c34Attempts.filter((attempt) => attempt.retryOf === ORIGINAL_NT01_ATTEMPT);
  const linkedRetryPlans = walRows.filter((row) =>
    row.event === 'ALLOCATION_PLANNED' && row.retryOf === ORIGINAL_NT01_ATTEMPT);
  const attemptDirectories = fs.readdirSync(C.ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  return {
    registryAttempts: registry.attempts.length,
    c34AttemptIds: c34Attempts.map((attempt) => attempt.attemptId).sort(),
    linkedRetryIds: linkedRetries.map((attempt) => attempt.attemptId).sort(),
    linkedRetryWalPlanLines: linkedRetryPlans.map((row) => row.line),
    attemptDirectories,
    registry: hashRecord(REGISTRY),
    wal: hashRecord(artifact('ATTEMPT_ALLOCATION_WAL.ndjson')),
    pass: registry.attempts.length === 220
      && c34Attempts.length === 2
      && linkedRetries.length === 0
      && linkedRetryPlans.length === 0
      && attemptDirectories.length === 2,
  };
}

function validateCompatibilityArtifact({ requireZeroAllocation = true } = {}) {
  C.requirePass(
    fs.existsSync(TIMEBOX_COMPATIBILITY_VALIDATION),
    'C34_TIMEBOX_COMPATIBILITY_VALIDATION_MISSING',
  );
  const compatibility = C.readJson(TIMEBOX_COMPATIBILITY_VALIDATION);
  const continuity = checkpoint25To27Continuity();
  const amended = amendedRunnerBinding();
  const priorValidation = C.readJson(TECHNICAL_RECOVERY_PREALLOCATION);
  const frozenRunner = path.join(
    TIMEBOX_CONTINUATION_SNAPSHOT,
    'evaluation__runner__phase-10a14-r20__commit5r1c34-execute.mjs',
  );
  const frozenLib = path.join(
    TIMEBOX_CONTINUATION_SNAPSHOT,
    'evaluation__runner__phase-10a14-r20__commit5r1c34-lib.mjs',
  );
  const immutableEvidenceCurrent = compatibility.immutableAuthorizationEvidence
    .map((record) => hashRecord(path.resolve(record.path)));
  const zeroAllocation = zeroRetryAllocationState();
  const pass = compatibility.pass === true
    && compatibility.decision === 'PASS_SUPERSEDING_COMPATIBILITY_VALIDATION'
    && continuity.pass
    && JSON.stringify(compatibility.checkpoint25To27.records.map((record) => ({
      ordinal: record.ordinal,
      sha256: record.numbered.sha256,
      eventSha256: record.eventSha256,
    }))) === JSON.stringify(continuity.records.map((record) => ({
      ordinal: record.ordinal,
      sha256: record.numbered.sha256,
      eventSha256: record.eventSha256,
    })))
    && JSON.stringify(compatibility.amendedRunnerBinding) === JSON.stringify(amended)
    && JSON.stringify(compatibility.priorRunnerHashes)
      === JSON.stringify(priorValidation.runnerHashes)
    && compatibility.priorRunnerHashes[C.RUNNER] === TIMEBOX_PREVIOUS_RUNNER_SHA256
    && compatibility.priorRunnerHashes[
      'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs'
    ] === TIMEBOX_LIB_SHA256
    && C.sha(fs.readFileSync(frozenRunner)) === TIMEBOX_PREVIOUS_RUNNER_SHA256
    && C.sha(fs.readFileSync(frozenLib)) === TIMEBOX_LIB_SHA256
    && JSON.stringify(immutableEvidenceCurrent)
      === JSON.stringify(compatibility.immutableAuthorizationEvidence)
    && (!requireZeroAllocation
      || (zeroAllocation.pass
        && zeroAllocation.registry.sha256 === compatibility.zeroAllocation.registry.sha256
        && zeroAllocation.wal.sha256 === compatibility.zeroAllocation.wal.sha256));
  C.requirePass(pass, 'C34_TIMEBOX_COMPATIBILITY_BINDING_INVALID');
  return { compatibility, continuity, amended, zeroAllocation, pass };
}

function timeboxedCompatibilityValidation() {
  const current = C.readJson(RECOVERY_CHECKPOINT);
  if (fs.existsSync(TIMEBOX_COMPATIBILITY_VALIDATION)) {
    const validated = validateCompatibilityArtifact();
    const result = appendIdempotentCheckpoint({
      ordinal: 28,
      updatedAtUtc: validated.compatibility.generatedUtc,
      stage: 'linked retry superseding compatibility validation',
      status: 'PASS_SUPERSEDING_COMPATIBILITY_VALIDATION',
      activeBaseHash: C.C33_IDENTITY.servicesTreeDigest,
      attemptId: null,
      artifacts: [
        TIMEBOX_COMPATIBILITY_VALIDATION,
        TECHNICAL_RECOVERY_PREALLOCATION,
        CHECKPOINT_27_SAFE_PAUSE,
        CHECKPOINT_27_SAFE_PAUSE_MANIFEST,
      ],
      nextExactOperation:
        'Run the amended no-allocation technical recovery preflight and require PASS_READY_FOR_LINKED_RETRY_ALLOCATION.',
      safeToResume: true,
    });
    console.log(JSON.stringify({ ...validated.compatibility, checkpoint: result.event }, null, 2));
    return validated.compatibility;
  }
  C.requirePass(
    current.ordinal === 27
      && C.sha(fs.readFileSync(RECOVERY_CHECKPOINT)) === TIMEBOX_CHECKPOINT_HASHES[27]
      && current.safeToResume === true
      && current.attemptId == null,
    'C34_TIMEBOX_COMPATIBILITY_REQUIRES_EXACT_CHECKPOINT_27',
  );
  const checkpoint25To27 = checkpoint25To27Continuity();
  const historicalManifest = historicalCheckpoint27ManifestVerification();
  const processState = processAndPortState();
  const ledger = C.reconcileC34AttemptLedger();
  const zeroAllocation = zeroRetryAllocationState();
  const registry = C.readJson(REGISTRY);
  const priorValidation = C.readJson(TECHNICAL_RECOVERY_PREALLOCATION);
  const immutableAuthorizationEvidence = [
    artifact('NT01_LINKED_RETRY_AUTHORIZATION.json'),
    TECHNICAL_RECOVERY_ADJUDICATION,
    TECHNICAL_RECOVERY_PREALLOCATION,
    numberedCheckpointPath(25),
    numberedCheckpointPath(26),
    numberedCheckpointPath(27),
    CHECKPOINT_27_SAFE_PAUSE,
    CHECKPOINT_27_SAFE_PAUSE_MANIFEST,
  ].map(hashRecord);
  const reconstructionRuntime = path.join(
    C.ATT,
    RECONSTRUCTION_ATTEMPT,
    'runtime-snapshot',
  );
  const activeBaseIdentity = C.runtimeFor(reconstructionRuntime);
  const liveServices = C.liveRuntimeIdentity();
  const priorFailedProcess = processState.otherNodeProcesses
    .find((item) => item.ProcessId === 26608);
  const priorFailedExecutorPidState = priorFailedProcess == null
    ? 'ABSENT'
    : /commit5r1c34-execute\.mjs/i.test(priorFailedProcess.CommandLine || '')
      ? 'ACTIVE_C34'
      : 'PID_REUSED_NON_C34';
  const gitState = {
    head: git('rev-parse', 'HEAD').trim(),
    branch: git('symbolic-ref', '--short', 'HEAD').trim(),
    upstream: git('rev-parse', '@{u}').trim(),
    sync: git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim(),
    stagedDiff: git('diff', '--cached', '--name-only').trim(),
    serviceDiff: git('diff', '--name-only', 'HEAD', '--', ...L.SERVICES.map(
      (name) => `services/${name}`,
    )).trim(),
    oracleDiff: git('diff', '--name-only', 'HEAD', '--', 'evaluation/oracles').trim(),
  };
  const compatibility = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: C.now(),
    timebox: {
      startedUtc: TIMEBOX_STARTED_UTC,
      hardStopUtc: TIMEBOX_HARD_STOP_UTC,
      retryLatestStartUtc: TIMEBOX_RETRY_LATEST_START_UTC,
    },
    decision: 'PASS_SUPERSEDING_COMPATIBILITY_VALIDATION',
    supersedesOnlyRunnerCompatibilityCheckIn:
      C.rel(TECHNICAL_RECOVERY_PREALLOCATION),
    priorAuthorizationEvidencePreserved: true,
    immutableAuthorizationEvidence,
    historicalCheckpoint27Manifest: historicalManifest,
    checkpoint25To27,
    priorRunnerHashes: priorValidation.runnerHashes,
    frozenPriorRunner: hashRecord(path.join(
      TIMEBOX_CONTINUATION_SNAPSHOT,
      'evaluation__runner__phase-10a14-r20__commit5r1c34-execute.mjs',
    )),
    frozenPriorLib: hashRecord(path.join(
      TIMEBOX_CONTINUATION_SNAPSHOT,
      'evaluation__runner__phase-10a14-r20__commit5r1c34-lib.mjs',
    )),
    amendedRunnerBinding: amendedRunnerBinding(),
    processState,
    priorFailedExecutorPid: 26608,
    priorFailedExecutorPidState,
    activeBase: {
      attemptId: RECONSTRUCTION_ATTEMPT,
      identity: activeBaseIdentity,
      expectedServicesTreeDigest: C.C33_IDENTITY.servicesTreeDigest,
    },
    liveServices: {
      identity: liveServices,
      expectedHeadServicesTreeDigest: '7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201',
      temporaryCandidateInstalled: gitState.serviceDiff !== '',
    },
    ledger,
    zeroAllocation,
    registrySelectedSemanticRuntime: registry.selectedSemanticRuntime,
    gitState,
    pass: false,
  };
  compatibility.pass = checkpoint25To27.pass
    && historicalManifest.pass
    && processState.processInspectionSucceeded
    && processState.allNodeCommandLinesReadable
    && processState.activeC34RunnerCount === 0
    && processState.netstatInspectionStatus === 0
    && processState.port5173Free
    && priorFailedExecutorPidState !== 'ACTIVE_C34'
    && ledger.pass
    && zeroAllocation.pass
    && activeBaseIdentity.servicesTreeDigest === C.C33_IDENTITY.servicesTreeDigest
    && liveServices.servicesTreeDigest
      === '7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201'
    && gitState.head === C.START_HEAD
    && gitState.branch === EXPECTED_BRANCH
    && gitState.upstream === C.START_HEAD
    && gitState.sync === '0\t0'
    && gitState.stagedDiff === ''
    && gitState.serviceDiff === ''
    && gitState.oracleDiff === ''
    && priorValidation.pass
    && priorValidation.runnerHashes[C.RUNNER] === TIMEBOX_PREVIOUS_RUNNER_SHA256
    && priorValidation.runnerHashes[
      'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs'
    ] === TIMEBOX_LIB_SHA256
    && registry.attempts.length === 220;
  C.requirePass(compatibility.pass, 'C34_TIMEBOX_COMPATIBILITY_VALIDATION_FAILED');
  writeOnceJson(TIMEBOX_COMPATIBILITY_VALIDATION, compatibility);
  appendIdempotentCheckpoint({
    ordinal: 28,
    updatedAtUtc: compatibility.generatedUtc,
    stage: 'linked retry superseding compatibility validation',
    status: 'PASS_SUPERSEDING_COMPATIBILITY_VALIDATION',
    activeBaseHash: C.C33_IDENTITY.servicesTreeDigest,
    attemptId: null,
    artifacts: [
      TIMEBOX_COMPATIBILITY_VALIDATION,
      TECHNICAL_RECOVERY_PREALLOCATION,
      CHECKPOINT_27_SAFE_PAUSE,
      CHECKPOINT_27_SAFE_PAUSE_MANIFEST,
    ],
    nextExactOperation:
      'Run the amended no-allocation technical recovery preflight and require PASS_READY_FOR_LINKED_RETRY_ALLOCATION.',
    safeToResume: true,
  });
  console.log(JSON.stringify(compatibility, null, 2));
  return compatibility;
}

function technicalRecoveryPreflight({
  expectedCheckpointOrdinal = 28,
  expectedCheckpointStage = 'linked retry superseding compatibility validation',
  expectedCheckpointStatus = 'PASS_SUPERSEDING_COMPATIBILITY_VALIDATION',
  requireGovernedNoAllocationPermit = false,
} = {}) {
  const required = [
    artifact('FULL_HEAD_PATCH_BLOCKER_ROOT_CAUSE.json'),
    artifact('FULL_HEAD_PATCH_BLOCKER_ROOT_CAUSE.md'),
    artifact('FULL_HEAD_PATCH_REMEDIATION_RESULT.json'),
    artifact('FULL_HEAD_PATCH_HEADER_VALIDATION.json'),
    artifact('FULL_HEAD_PATCH_REPLAY_SELF_TEST.json'),
    artifact('NT01_LINKED_RETRY_AUTHORIZATION.json'),
    TECHNICAL_RECOVERY_ADJUDICATION,
    TECHNICAL_RECOVERY_PREALLOCATION,
    TIMEBOX_COMPATIBILITY_VALIDATION,
    path.join(C.ATT, ORIGINAL_NT01_ATTEMPT, 'EXECUTOR_TECHNICAL_STOP_RECOVERY.json'),
  ];
  if (requireGovernedNoAllocationPermit) required.push(TIMEBOX_NO_ALLOCATION_PREFLIGHT);
  for (const file of required) {
    C.requirePass(fs.existsSync(file), `C34_TECHNICAL_RECOVERY_REQUIRED_FILE_MISSING_${C.rel(file)}`);
  }
  const validation = C.readJson(TECHNICAL_RECOVERY_PREALLOCATION);
  const authorization = C.readJson(artifact('NT01_LINKED_RETRY_AUTHORIZATION.json'));
  const rootCause = C.readJson(artifact('FULL_HEAD_PATCH_BLOCKER_ROOT_CAUSE.json'));
  const remediation = C.readJson(artifact('FULL_HEAD_PATCH_REMEDIATION_RESULT.json'));
  const headerValidation = C.readJson(artifact('FULL_HEAD_PATCH_HEADER_VALIDATION.json'));
  const selfTests = C.readJson(artifact('FULL_HEAD_PATCH_REPLAY_SELF_TEST.json'));
  const recoveryRecord = C.readJson(
    path.join(C.ATT, ORIGINAL_NT01_ATTEMPT, 'EXECUTOR_TECHNICAL_STOP_RECOVERY.json'),
  );
  const registry = C.readJson(REGISTRY);
  const technicalRecord = registry.attempts.find(
    (attempt) => attempt.attemptId === ORIGINAL_NT01_ATTEMPT,
  );
  const checkpointState = C.readJson(RECOVERY_CHECKPOINT);
  const checkpointChain = validateCheckpointChain();
  const checkpoint25To27 = checkpoint25To27Continuity();
  const ledger = C.reconcileC34AttemptLedger();
  const processes = processAndPortState();
  const externalTechnicalFreeze = verifyExternalTechnicalRecoverySnapshot();
  const compatibilityValidation = validateCompatibilityArtifact();
  const governedNoAllocationPermit = requireGovernedNoAllocationPermit
    ? C.readJson(TIMEBOX_NO_ALLOCATION_PREFLIGHT)
    : null;
  const walRows = readWalRows();
  const linkedRetryWalPlans = walRows.filter((row) =>
    row.event === 'ALLOCATION_PLANNED' && row.retryOf === ORIGINAL_NT01_ATTEMPT);
  const currentRunnerHashes = {
    [C.RUNNER]: C.sha(fs.readFileSync(C.RUNNER)),
    'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs':
      C.sha(fs.readFileSync('evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs')),
  };
  const trackedDiff = git('diff', '--name-only', 'HEAD').trim().split(/\r?\n/).filter(Boolean);
  const result = {
    unit: UNIT,
    generatedUtc: C.now(),
    mode: 'FULL_HEAD_PATCH_BLOCKER_LINKED_RETRY_PREFLIGHT',
    head: git('rev-parse', 'HEAD').trim(),
    branch: git('symbolic-ref', '--short', 'HEAD').trim(),
    upstream: git('rev-parse', '@{u}').trim(),
    sync: git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim(),
    trackedDiff,
    stagedDiff: git('diff', '--cached', '--name-only').trim(),
    serviceDiff: git(
      'diff',
      '--name-only',
      'HEAD',
      '--',
      ...L.SERVICES.map((name) => `services/${name}`),
    ).trim(),
    oracleDiff: git('diff', '--name-only', 'HEAD', '--', 'evaluation/oracles').trim(),
    processAndPortState: processes,
    gitIndexLockExists: fs.existsSync(path.join(C.REPO, '.git', 'index.lock')),
    requiredArtifacts: required.map(hashRecord),
    rootCause,
    remediation,
    headerValidation,
    selfTests: {
      pass: selfTests.pass,
      testA: selfTests.testA.pass,
      testB: selfTests.testB.pass,
      testC: selfTests.testC.pass,
      testD: selfTests.testD.pass,
      noAllocationOrGovernedStateMutation: selfTests.noAllocationOrGovernedStateMutation,
    },
    authorization,
    recoveryRecord,
    checkpoint: checkpointState,
    checkpointChain,
    checkpoint25To27,
    ledger,
    frozenNt01: frozenNt01Integrity({ allowRecoveryArtifact: true }),
    externalTechnicalFreeze,
    runnerHashes: currentRunnerHashes,
    recordedRunnerHashes: validation.runnerHashes,
    compatibilityValidation: {
      artifact: hashRecord(TIMEBOX_COMPATIBILITY_VALIDATION),
      decision: compatibilityValidation.compatibility.decision,
      amendedRunnerBinding: compatibilityValidation.amended,
      pass: compatibilityValidation.pass,
    },
    governedNoAllocationPermit: governedNoAllocationPermit == null
      ? null
      : {
        artifact: hashRecord(TIMEBOX_NO_ALLOCATION_PREFLIGHT),
        decision: governedNoAllocationPermit.decision,
        pass: governedNoAllocationPermit.pass,
      },
    linkedRetryWalPlanLines: linkedRetryWalPlans.map((row) => row.line),
    registry: {
      totalAttempts: registry.attempts.length,
      selectedSemanticRuntime: registry.selectedSemanticRuntime,
      technicalRecord,
      linkedRetries: registry.attempts
        .filter((attempt) => attempt.retryOf === ORIGINAL_NT01_ATTEMPT)
        .map((attempt) => attempt.attemptId),
      technicalAdjudications: registry.technicalAdjudications || [],
    },
    pass: false,
  };
  result.pass = result.head === C.START_HEAD
    && result.branch === EXPECTED_BRANCH
    && result.upstream === C.START_HEAD
    && result.sync === '0\t0'
    && JSON.stringify(trackedDiff) === JSON.stringify([C.rel(REGISTRY)])
    && result.stagedDiff === ''
    && result.serviceDiff === ''
    && result.oracleDiff === ''
    && !result.gitIndexLockExists
    && processes.processInspectionStatus === 0
    && processes.processInspectionSucceeded
    && processes.allNodeCommandLinesReadable
    && processes.activeC34RunnerCount === 0
    && processes.netstatInspectionStatus === 0
    && processes.port5173Free
    && required.every((file) => fs.existsSync(file))
    && rootCause.pass
    && rootCause.determination === 'FULL_HEAD_PATCH_VALIDATION_FALSE_POSITIVE'
    && remediation.pass
    && headerValidation.pass
    && selfTests.pass
    && selfTests.testA.pass
    && selfTests.testB.pass
    && selfTests.testC.pass
    && selfTests.testD.pass
    && selfTests.noAllocationOrGovernedStateMutation
    && recoveryRecord.pass
    && recoveryRecord.effectiveDisposition === 'TECHNICAL_INCOMPLETE_EXECUTOR_STOP'
    && recoveryRecord.semanticDisposition === 'NOT_A_SEMANTIC_REJECTION'
    && authorization.pass
    && authorization.retryOf === ORIGINAL_NT01_ATTEMPT
    && authorization.retryReason === 'C34_FULL_HEAD_PATCH_INVALID'
    && authorization.retryType === 'TECHNICAL_LINKED_RETRY'
    && authorization.newAttemptOrdinal === 2
    && validation.pass
    && validation.decision === 'PASS_READY_FOR_LINKED_NT01_RETRY'
    && JSON.stringify(validation.runnerHashes)
      === JSON.stringify(compatibilityValidation.compatibility.priorRunnerHashes)
    && currentRunnerHashes[C.RUNNER]
      === compatibilityValidation.compatibility.amendedRunnerBinding.runner.sha256
    && currentRunnerHashes[
      'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs'
    ] === compatibilityValidation.compatibility.amendedRunnerBinding.lib.sha256
    && JSON.stringify(amendedRunnerBinding())
      === JSON.stringify(compatibilityValidation.compatibility.amendedRunnerBinding)
    && compatibilityValidation.pass
    && checkpoint25To27.pass
    && checkpointState.ordinal === expectedCheckpointOrdinal
    && checkpointState.stage === expectedCheckpointStage
    && checkpointState.status === expectedCheckpointStatus
    && checkpointState.safeToResume === true
    && checkpointState.attemptId == null
    && checkpointState.activeBaseHash === C.C33_IDENTITY.servicesTreeDigest
    && checkpointChain.pass
    && checkpointChain.rows === expectedCheckpointOrdinal
    && ledger.pass
    && result.frozenNt01.pass
    && externalTechnicalFreeze.pass
    && registry.attempts.length === 220
    && technicalRecord.status === 'technical_failure'
    && technicalRecord.disposition === 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE'
    && result.registry.linkedRetries.length === 0
    && linkedRetryWalPlans.length === 0
    && result.registry.technicalAdjudications.length === 1
    && result.registry.technicalAdjudications[0].originalAttemptId === ORIGINAL_NT01_ATTEMPT
    && registry.selectedSemanticRuntime?.attemptId === C.SELECTED_C33_ATTEMPT
    && registry.selectedSemanticRuntime?.identity?.servicesTreeDigest
      === C.C33_IDENTITY.servicesTreeDigest
    && (!requireGovernedNoAllocationPermit
      || (
        governedNoAllocationPermit?.pass === true
        && governedNoAllocationPermit?.decision === 'PASS_READY_FOR_LINKED_RETRY_ALLOCATION'
        && governedNoAllocationPermit?.checkpointContract?.ordinal === 29
        && governedNoAllocationPermit?.compatibilityArtifact?.sha256
          === C.sha(fs.readFileSync(TIMEBOX_COMPATIBILITY_VALIDATION))
        && governedNoAllocationPermit?.runnerBinding?.runner?.sha256
          === currentRunnerHashes[C.RUNNER]
      ));
  C.requirePass(result.pass, `C34_TECHNICAL_RECOVERY_PREFLIGHT_FAILED_${JSON.stringify(result)}`);
  return {
    result,
    validation,
    registry,
    compatibility: compatibilityValidation.compatibility,
    governedNoAllocationPermit,
    originalPreflight: C.readJson(artifact('PREFLIGHT.json')),
  };
}

function timeboxedNoAllocationPreflight() {
  if (fs.existsSync(TIMEBOX_NO_ALLOCATION_PREFLIGHT)) {
    const permit = C.readJson(TIMEBOX_NO_ALLOCATION_PREFLIGHT);
    const compatibility = validateCompatibilityArtifact();
    const zeroAllocation = zeroRetryAllocationState();
    C.requirePass(
      permit.pass === true
        && permit.decision === 'PASS_READY_FOR_LINKED_RETRY_ALLOCATION'
        && permit.checkpointContract?.ordinal === 29
        && permit.compatibilityArtifact?.sha256
          === C.sha(fs.readFileSync(TIMEBOX_COMPATIBILITY_VALIDATION))
        && JSON.stringify(permit.runnerBinding) === JSON.stringify(amendedRunnerBinding())
        && zeroAllocation.pass
        && zeroAllocation.registry.sha256 === permit.registryAfter.sha256
        && zeroAllocation.wal.sha256 === permit.walAfter.sha256
        && compatibility.pass,
      'C34_EXISTING_NO_ALLOCATION_PREFLIGHT_INVALID',
    );
    const checkpointResult = appendIdempotentCheckpoint({
      ordinal: 29,
      updatedAtUtc: permit.generatedUtc,
      stage: 'linked retry governed no-allocation preflight',
      status: 'PASS_READY_FOR_LINKED_RETRY_ALLOCATION',
      activeBaseHash: C.C33_IDENTITY.servicesTreeDigest,
      attemptId: null,
      artifacts: [TIMEBOX_NO_ALLOCATION_PREFLIGHT, TIMEBOX_COMPATIBILITY_VALIDATION],
      nextExactOperation:
        'If at least 20 minutes remain, allocate exactly one new nt01-retry01 ordinal-2 TECHNICAL_LINKED_RETRY of the original NT01 against the exact C33 M01R base.',
      safeToResume: true,
    });
    console.log(JSON.stringify({ ...permit, checkpoint: checkpointResult.event }, null, 2));
    return permit;
  }
  const current = C.readJson(RECOVERY_CHECKPOINT);
  C.requirePass(
    current.ordinal === 28
      && current.stage === 'linked retry superseding compatibility validation'
      && current.status === 'PASS_SUPERSEDING_COMPATIBILITY_VALIDATION'
      && current.safeToResume === true
      && current.attemptId == null
      && current.activeBaseHash === C.C33_IDENTITY.servicesTreeDigest,
    'C34_NO_ALLOCATION_PREFLIGHT_REQUIRES_EXACT_CHECKPOINT_28',
  );
  const compatibility = validateCompatibilityArtifact();
  const zeroBefore = zeroRetryAllocationState();
  const attemptDirectoriesBefore = [...zeroBefore.attemptDirectories];
  const recovery = technicalRecoveryPreflight({
    expectedCheckpointOrdinal: 28,
    expectedCheckpointStage: 'linked retry superseding compatibility validation',
    expectedCheckpointStatus: 'PASS_SUPERSEDING_COMPATIBILITY_VALIDATION',
  });
  const zeroAfter = zeroRetryAllocationState();
  const attemptDirectoriesAfter = [...zeroAfter.attemptDirectories];
  const permit = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: C.now(),
    decision: 'PASS_READY_FOR_LINKED_RETRY_ALLOCATION',
    timebox: {
      startedUtc: TIMEBOX_STARTED_UTC,
      hardStopUtc: TIMEBOX_HARD_STOP_UTC,
      retryLatestStartUtc: TIMEBOX_RETRY_LATEST_START_UTC,
      remainingMsAtPass: Date.parse(TIMEBOX_HARD_STOP_UTC) - Date.now(),
    },
    compatibilityArtifact: hashRecord(TIMEBOX_COMPATIBILITY_VALIDATION),
    runnerBinding: amendedRunnerBinding(),
    checkpoint25To27: recovery.result.checkpoint25To27,
    checkpointBefore: current,
    checkpointContract: {
      ordinal: 29,
      stage: 'linked retry governed no-allocation preflight',
      status: 'PASS_READY_FOR_LINKED_RETRY_ALLOCATION',
      safeToResume: true,
      attemptId: null,
      activeBaseHash: C.C33_IDENTITY.servicesTreeDigest,
    },
    processState: recovery.result.processAndPortState,
    registryBefore: zeroBefore.registry,
    registryAfter: zeroAfter.registry,
    walBefore: zeroBefore.wal,
    walAfter: zeroAfter.wal,
    attemptDirectoriesBefore,
    attemptDirectoriesAfter,
    ledger: recovery.result.ledger,
    recoveryPreflight: recovery.result,
    allocationPerformed: false,
    pass: false,
  };
  permit.pass = compatibility.pass
    && recovery.result.pass
    && zeroBefore.pass
    && zeroAfter.pass
    && zeroBefore.registry.sha256 === zeroAfter.registry.sha256
    && zeroBefore.wal.sha256 === zeroAfter.wal.sha256
    && JSON.stringify(attemptDirectoriesBefore) === JSON.stringify(attemptDirectoriesAfter)
    && recovery.result.processAndPortState.processInspectionSucceeded
    && recovery.result.processAndPortState.activeC34RunnerCount === 0
    && recovery.result.processAndPortState.port5173Free
    && recovery.result.ledger.pass;
  C.requirePass(permit.pass, 'C34_NO_ALLOCATION_PREFLIGHT_NOT_PASSING');
  writeOnceJson(TIMEBOX_NO_ALLOCATION_PREFLIGHT, permit);
  appendIdempotentCheckpoint({
    ordinal: 29,
    updatedAtUtc: permit.generatedUtc,
    stage: 'linked retry governed no-allocation preflight',
    status: 'PASS_READY_FOR_LINKED_RETRY_ALLOCATION',
    activeBaseHash: C.C33_IDENTITY.servicesTreeDigest,
    attemptId: null,
    artifacts: [TIMEBOX_NO_ALLOCATION_PREFLIGHT, TIMEBOX_COMPATIBILITY_VALIDATION],
    nextExactOperation:
      'If at least 20 minutes remain, allocate exactly one new nt01-retry01 ordinal-2 TECHNICAL_LINKED_RETRY of the original NT01 against the exact C33 M01R base.',
    safeToResume: true,
  });
  console.log(JSON.stringify(permit, null, 2));
  return permit;
}

async function loadDebugAnalyzerFrom(directory) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tina-c34-debug-analyzer-'));
  C.copyRuntime(directory, temporaryRoot);
  const analyzerPath = path.join(temporaryRoot, 'philippine-tax-intent-analyzer.js');
  const source = fs.readFileSync(analyzerPath, 'utf8');
  const marker =
    '    ambiguityFlags: Object.freeze(ambiguityFlags),\n    decision, reasonCode, confidence,';
  C.requirePass(source.includes(marker), 'C34_DEBUG_ANALYZER_INSERTION_POINT_MISSING');
  const instrumented = source.replace(
    marker,
    `    ambiguityFlags: Object.freeze(ambiguityFlags),
    ...(options.c34Debug ? { c34DebugEvidence: evidenceForDecision } : {}),
    decision, reasonCode, confidence,`,
  );
  fs.writeFileSync(analyzerPath, instrumented.replace(/\r\n/g, '\n'));
  const module = await import(
    `${pathToFileURL(analyzerPath).href}?c34debug=${Date.now()}-${Math.random()}`
  );
  return {
    analyze: (query) => module.analyzePhilippineTaxIntent(query),
    debugAnalyze: (query) => module.analyzePhilippineTaxIntent(query, { c34Debug: true }),
    temporaryRoot,
  };
}

function removeOwnedTemp(directory, prefix) {
  const resolved = path.resolve(directory);
  const temp = path.resolve(os.tmpdir());
  C.requirePass(
    resolved.startsWith(`${temp}${path.sep}`) && path.basename(resolved).startsWith(prefix),
    `C34_REFUSING_UNOWNED_TEMP_REMOVAL_${resolved}`,
  );
  fs.rmSync(resolved, { recursive: true, force: true });
}

function exactBaseMetrics(gates) {
  return Object.entries(C.BASE_METRICS).every(([key, value]) => gates.metrics[key] === value)
    && gates.metrics.reasonIntegrityPass
    && gates.metrics.decisionLockHeld
    && gates.metrics.relationLockHeld
    && gates.frozenLocksHeld;
}

function terminalizeTechnical(attempt, error, label) {
  if (!attempt) return;
  const attemptFile = path.join(attempt.dir, 'ATTEMPT.json');
  if (!fs.existsSync(attemptFile) || C.readJson(attemptFile).status !== 'running') return;
  C.appendAttemptLog(attempt, 'stderr', error?.stack || String(error));
  const resultPath = path.join(attempt.dir, 'TECHNICAL_FAILURE.json');
  if (!fs.existsSync(resultPath)) {
    writeOnceJson(resultPath, {
      unit: UNIT,
      generatedUtc: C.now(),
      attemptId: attempt.attemptId,
      label,
      classification: 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE',
      error: error?.stack || String(error),
      semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
      recoverableOnlyByNewLinkedAttempt: true,
    });
  }
  C.finalizeAttempt(attempt, {
    disposition: 'TECHNICAL_INCOMPLETE_EXECUTOR_FAILURE',
    status: 'technical_failure',
    exitCode: 1,
    resultPaths: [resultPath],
  });
}

async function reconstructSelectedBase() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tina-c34-reconstruction-'));
  const reconstructed = path.join(temporaryRoot, 'runtime');
  let attempt = null;
  try {
    const identity = C.reconstructCommittedSnapshot(reconstructed);
    attempt = C.allocateAttempt({
      category: 'domain_campaign',
      gate: GATE_NAME,
      cycle: 'reconstruct',
      ordinal: 1,
      semanticBase: {
        sourceCommit: C.START_HEAD,
        selectedC33Attempt: C.SELECTED_C33_ATTEMPT,
        selectedSnapshotTree: C.SELECTED_C33_SNAPSHOT_TREE,
        servicesTreeDigest: C.C33_IDENTITY.servicesTreeDigest,
      },
      runtimeDirectory: reconstructed,
    });
    C.appendAttemptLog(
      attempt,
      'stdout',
      `Reconstructing exact C33 selected runtime from committed tree ${C.SELECTED_C33_SNAPSHOT_TREE}.`,
    );
    const snapshot = path.join(attempt.dir, 'runtime-snapshot');
    C.copyRuntime(reconstructed, snapshot);
    const snapshotIdentity = C.runtimeFor(snapshot);
    C.requirePass(C.sameRuntime(snapshotIdentity, C.C33_IDENTITY), 'C34_RECONSTRUCTED_SNAPSHOT_DRIFT');
    writeOnceJson(path.join(snapshot, 'RUNTIME_IDENTITY.json'), snapshotIdentity);
    const gates = await C.directGatesForDirectory(snapshot);
    C.requirePass(exactBaseMetrics(gates), `C34_RECONSTRUCTED_BASE_GATE_MISMATCH_${JSON.stringify(gates.metrics)}`);
    const result = {
      unit: UNIT,
      generatedUtc: C.now(),
      attemptId: attempt.attemptId,
      disposition: 'RECONSTRUCTED_EXACT_C33_SELECTED_RUNTIME',
      sourceCommit: C.START_HEAD,
      selectedC33Attempt: C.SELECTED_C33_ATTEMPT,
      selectedSnapshotTree: C.SELECTED_C33_SNAPSHOT_TREE,
      selectedSnapshotBlobs: C.SELECTED_C33_SNAPSHOT_BLOBS,
      identity: snapshotIdentity,
      gates,
      exactIdentity: C.sameRuntime(snapshotIdentity, C.C33_IDENTITY),
      exactBaseMetrics: exactBaseMetrics(gates),
      pass: true,
    };
    const resultPath = path.join(attempt.dir, 'ITERATION_RESULT.json');
    writeOnceJson(resultPath, result);
    C.appendAttemptLog(
      attempt,
      'stdout',
      `PASS exact identity; R3 reason ${gates.metrics.reasonPassed}/3720; frozen gates exact.`,
    );
    C.finalizeAttempt(attempt, {
      disposition: result.disposition,
      resultPaths: [resultPath, path.join(snapshot, 'RUNTIME_IDENTITY.json')],
    });
    const baseIdentityPath = artifact('BASE_RUNTIME_IDENTITY.json');
    const reconstructionPath = artifact('C33_SELECTED_RUNTIME_RECONSTRUCTION.json');
    writeOnceJson(baseIdentityPath, {
      unit: UNIT,
      generatedUtc: C.now(),
      semanticBase: 'exact C33 selected M01R runtime',
      selectedAttempt: C.SELECTED_C33_ATTEMPT,
      identity: snapshotIdentity,
      expected: C.C33_IDENTITY,
      pass: C.sameRuntime(snapshotIdentity, C.C33_IDENTITY),
    });
    writeOnceJson(reconstructionPath, {
      ...result,
      attemptResult: C.rel(resultPath),
      immutableAttemptSnapshot: C.rel(snapshot),
    });
    removeOwnedTemp(temporaryRoot, 'tina-c34-reconstruction-');
    checkpoint({
      stage: 'R5 exact M01R reconstruction',
      status: 'COMPLETED',
      activeBaseHash: snapshotIdentity.servicesTreeDigest,
      attemptId: attempt.attemptId,
      artifacts: [baseIdentityPath, reconstructionPath, resultPath],
      nextExactOperation: 'Reconcile all 216 remaining reason-only residuals against the exact reconstructed M01R runtime.',
      safeToResume: true,
    });
    return { attempt, dir: snapshot, identity: snapshotIdentity, gates, result };
  } catch (error) {
    terminalizeTechnical(attempt, error, 'exact C33 M01R reconstruction');
    throw error;
  }
}

function structuralVector(row, evidence) {
  const debug = evidence.c34DebugEvidence || {};
  const relations = (evidence.relations || []).map((relation) => relation.relation);
  return {
    expectedReason: row.expectedReasonCodeFamily,
    actualReason: evidence.reasonCode,
    speechAct: evidence.speechAct,
    operationClass: debug.reasonRequestOperationClass || null,
    requestedOutcome: debug.reasonRequestedOutcomeClass || null,
    taskVerb: debug.reasonPrimaryTaskVerb || evidence.requestedAction || null,
    taskObjectPresent: !!(debug.reasonPrimaryTaskObject || evidence.requestedTarget),
    targetCompleteness: debug.targetCompleteness || null,
    requestsOperation: !!debug.reasonRequestsOperation,
    primaryIsInterrogative: !!debug.primaryIsInterrogative,
    nonTaxControllingDomain: !!debug.nonTaxControllingDomain,
    ordinaryProceduralSense: !!debug.ordinaryProceduralSense,
    explicitTaxAnchorPresent: !!debug.explicitTaxAnchorPresent,
    governedTaxPredicateAnywhere: !!debug.governedTaxPredicateAnywhere,
    taxRelationOverPrimaryTarget: !!debug.taxRelationOverPrimaryTarget,
    filipinoTaxRelationOverTarget: !!debug.filipinoTaxRelationOverTarget,
    definitionOutcomeUnderTaxContext: !!debug.reasonDefinitionOutcomeUnderTaxContext,
    localRedefinitionAct: !!debug.reasonLocalRedefinitionAct,
    namingActControlsRequest: !!debug.namingActControlsRequest,
    stylingOrProgramTarget: !!debug.stylingOrProgramTarget,
    proceduralComplianceFrame: !!debug.proceduralComplianceFrame,
    contractQuestionAboutTaxClause: !!debug.contractQuestionAboutTaxClause,
    statuteInEffectFrame: !!debug.statuteInEffectFrame,
    relations,
  };
}

function vectorDistance(first, second) {
  const keys = Object.keys(first).filter((key) =>
    !['expectedReason', 'actualReason'].includes(key));
  return keys.reduce((sum, key) =>
    sum + (JSON.stringify(first[key]) === JSON.stringify(second[key]) ? 0 : 1), 0);
}

async function residualInventory(base) {
  const debugRuntime = await loadDebugAnalyzerFrom(base.dir);
  try {
    const rows = L.loadR3();
    const evaluated = rows.map((row) => {
      const evidence = debugRuntime.debugAnalyze(row.query);
      return {
        row,
        evidence,
        correct: C.rowPass(row, evidence),
        vector: structuralVector(row, evidence),
      };
    });
    const correct = evaluated.filter((record) => record.correct);
    const residuals = evaluated.filter((record) => !record.correct);
    C.requirePass(residuals.length === 216, `C34_RESIDUAL_COUNT_${residuals.length}`);
    const records = residuals.map((record) => {
      const nearest = correct.map((control) => ({
        oracleId: control.row.oracleId,
        query: control.row.query,
        expectedReason: control.row.expectedReasonCodeFamily,
        actualReason: control.evidence.reasonCode,
        distance: vectorDistance(record.vector, control.vector),
      })).sort((first, second) =>
        first.distance - second.distance || first.oracleId.localeCompare(second.oracleId))
        .slice(0, 3);
      const debug = record.evidence.c34DebugEvidence || {};
      return {
        oracleId: record.row.oracleId,
        query: record.row.query,
        sourceSet: record.row.sourceSet,
        primaryCategory: record.row.primaryCategory,
        expectedDecision: record.row.expectedDecision,
        expectedReason: record.row.expectedReasonCodeFamily,
        expectedRelations: (record.row.expectedRelations || []).map((relation) => relation.relation),
        actual: C.compactEvidence(record.evidence),
        speechAct: record.evidence.speechAct,
        actionClass: debug.reasonRequestOperationClass || null,
        operandCompleteness: debug.targetCompleteness || null,
        performability: {
          requestsOperation: !!debug.reasonRequestsOperation,
          taskVerb: debug.reasonPrimaryTaskVerb || null,
          taskObject: debug.reasonPrimaryTaskObject || null,
        },
        requestedOutput: debug.reasonRequestedOutcomeClass || null,
        taxNexus: {
          explicitTaxAnchorPresent: !!debug.explicitTaxAnchorPresent,
          governedTaxPredicateAnywhere: !!debug.governedTaxPredicateAnywhere,
          taxRelationOverPrimaryTarget: !!debug.taxRelationOverPrimaryTarget,
          filipinoTaxRelationOverTarget: !!debug.filipinoTaxRelationOverTarget,
        },
        treatmentProcedureCompliance: {
          ordinaryProceduralSense: !!debug.ordinaryProceduralSense,
          proceduralComplianceFrame: !!debug.proceduralComplianceFrame,
          contractQuestionAboutTaxClause: !!debug.contractQuestionAboutTaxClause,
          statuteInEffectFrame: !!debug.statuteInEffectFrame,
          relations: record.vector.relations,
        },
        m01rFiring: false,
        assignmentSite:
          'exact C33 governed override seam followed by frozen original reason selector',
        precedencePath: [
          `baseline-or-prior=${record.evidence.reasonCode}`,
          'C33-M01R did not produce the expected reason',
          `final=${record.evidence.reasonCode}`,
        ],
        structuralVector: record.vector,
        nearestCorrectControls: nearest,
      };
    });
    const expectedCounts = {};
    const overlap = {};
    for (const record of records) {
      expectedCounts[record.expectedReason] = (expectedCounts[record.expectedReason] || 0) + 1;
      const key = `${record.actual.reasonCode} -> ${record.expectedReason}`;
      overlap[key] = (overlap[key] || 0) + 1;
    }
    const expectedDeficits = {
      no_tax_relation: 133,
      explicit_non_tax_task: 50,
      explicit_tax_task_relation: 27,
      tax_treatment_of_ordinary_object: 5,
      tax_compliance_task: 1,
    };
    C.requirePass(
      Object.entries(expectedDeficits).every(([reason, count]) => expectedCounts[reason] === count)
        && Object.keys(expectedCounts).length === Object.keys(expectedDeficits).length,
      `C34_RESIDUAL_DEFICITS_${JSON.stringify(expectedCounts)}`,
    );
    const inventory = {
      unit: UNIT,
      generatedUtc: C.now(),
      activeBaseIdentity: base.identity,
      totalRows: rows.length,
      correctRows: correct.length,
      residualCount: records.length,
      reasonOnly: records.every((record) =>
        record.actual.decision === record.expectedDecision
        && record.expectedRelations.every((relation) => record.actual.relations.includes(relation))),
      reasonSuiteFailures: base.gates.gates.reasonCounterfactual.failed,
      collisionFailures: base.gates.gates.collisionProbes.failed,
      expectedDeficits,
      actualDeficits: expectedCounts,
      records,
      pass: records.length === 216,
    };
    const overlapMap = {
      unit: UNIT,
      generatedUtc: C.now(),
      actualToExpected: overlap,
      total: Object.values(overlap).reduce((sum, value) => sum + value, 0),
      pass: Object.values(overlap).reduce((sum, value) => sum + value, 0) === 216,
    };
    const familySummary = {
      unit: UNIT,
      generatedUtc: C.now(),
      expectedReasonDeficits: expectedCounts,
      actualReasonCounts: records.reduce((counts, record) => {
        counts[record.actual.reasonCode] = (counts[record.actual.reasonCode] || 0) + 1;
        return counts;
      }, {}),
      treatmentFamily: base.gates.metrics.focusedReasonFamilies.tax_treatment_of_ordinary_object,
      pass: true,
    };
    const matrixGroups = new Map();
    for (const record of records) {
      const vector = record.structuralVector;
      const key = JSON.stringify({
        expectedReason: record.expectedReason,
        requestsOperation: vector.requestsOperation,
        primaryIsInterrogative: vector.primaryIsInterrogative,
        nonTaxControllingDomain: vector.nonTaxControllingDomain,
        targetCompleteness: vector.targetCompleteness,
        governedTaxPredicateAnywhere: vector.governedTaxPredicateAnywhere,
        proceduralComplianceFrame: vector.proceduralComplianceFrame,
      });
      if (!matrixGroups.has(key)) matrixGroups.set(key, { vector: JSON.parse(key), count: 0, oracleIds: [] });
      const group = matrixGroups.get(key);
      group.count++;
      group.oracleIds.push(record.oracleId);
    }
    const matrix = {
      unit: UNIT,
      generatedUtc: C.now(),
      dimensions: [
        'expectedReason',
        'requestsOperation',
        'primaryIsInterrogative',
        'nonTaxControllingDomain',
        'targetCompleteness',
        'governedTaxPredicateAnywhere',
        'proceduralComplianceFrame',
      ],
      groups: [...matrixGroups.values()].sort((first, second) => second.count - first.count),
      total: records.length,
      pass: true,
    };
    const trace = {
      unit: UNIT,
      generatedUtc: C.now(),
      activeBase: base.identity.servicesTreeDigest,
      rows: records.map((record) => ({
        oracleId: record.oracleId,
        expectedReason: record.expectedReason,
        actualReason: record.actual.reasonCode,
        m01rFiring: record.m01rFiring,
        assignmentSite: record.assignmentSite,
        precedencePath: record.precedencePath,
      })),
      pass: records.length === 216,
    };
    const files = {
      inventory: artifact('POST_M01R_RESIDUAL_INVENTORY.json'),
      overlap: artifact('POST_M01R_RESIDUAL_OVERLAP_MAP.json'),
      family: artifact('POST_M01R_REASON_FAMILY_SUMMARY.json'),
      matrix: artifact('ACTIONABILITY_COMPLETENESS_AND_TAX_NEXUS_MATRIX.json'),
      trace: artifact('REASON_ASSIGNMENT_PRECEDENCE_TRACE.json'),
    };
    writeOnceJson(files.inventory, inventory);
    writeOnceJson(files.overlap, overlapMap);
    writeOnceJson(files.family, familySummary);
    writeOnceJson(files.matrix, matrix);
    writeOnceJson(files.trace, trace);
    checkpoint({
      stage: 'R6 216-row residual reconciliation',
      status: 'COMPLETED',
      activeBaseHash: base.identity.servicesTreeDigest,
      attemptId: base.attempt.attemptId,
      artifacts: Object.values(files),
      nextExactOperation: 'Freeze the 18 structural hypotheses and six-candidate bounded execution order.',
      safeToResume: true,
    });
    return { records, expectedCounts, overlap, files };
  } finally {
    removeOwnedTemp(debugRuntime.temporaryRoot, 'tina-c34-debug-analyzer-');
  }
}

async function buildPreservationBaseline(base) {
  const analyze = await C.loadAnalyzerFrom(base.dir, 'c34-preservation-base');
  const c33 = C.readJson(C33_RESULT);
  C.requirePass(c33.accepted === true, 'C34_C33_SELECTED_RESULT_NOT_ACCEPTED');
  C.requirePass(c33.rowLevel.newlyCorrected.length === 22, 'C34_C33_M01R_CORRECTION_COUNT');
  const m01rRows = c33.rowLevel.newlyCorrected.map((record) => ({
    oracleId: record.oracleId,
    query: record.query,
    expectedDecision: record.expectedDecision,
    expectedReason: record.expectedReason,
    signature: C.outputSignature(analyze(record.query)),
  }));
  const generalizationRows = c33.generalization.rows.map((record) => ({
    category: record.category,
    query: record.query,
    selectedSignature: C.outputSignature(analyze(record.query)),
    selectedEvidence: C.compactEvidence(analyze(record.query)),
    c33Pass: record.pass,
  }));
  const leaveOneFamilyOutRows = c33.leaveOneFamilyOut.records.map((record) => ({
    query: record.query,
    selectedSignature: C.outputSignature(analyze(record.query)),
    selectedEvidence: C.compactEvidence(analyze(record.query)),
    c33Pass: record.pass,
  }));
  const priorCorrectRows = L.loadR3().flatMap((row) => {
    const evidence = analyze(row.query);
    return C.rowPass(row, evidence)
      ? [{
        oracleId: row.oracleId,
        query: row.query,
        signature: C.outputSignature(evidence),
      }]
      : [];
  });
  C.requirePass(priorCorrectRows.length === 3504, 'C34_M01R_PRIOR_CORRECT_COUNT');
  const treatmentFamily = base.gates.metrics.focusedReasonFamilies
    .tax_treatment_of_ordinary_object;
  C.requirePass(
    treatmentFamily.required === 784 && treatmentFamily.satisfied === 779,
    `C34_M01R_TREATMENT_FAMILY_${JSON.stringify(treatmentFamily)}`,
  );
  const baseline = {
    unit: UNIT,
    generatedUtc: C.now(),
    exactM01rIdentity: base.identity,
    selectedC33Attempt: C.SELECTED_C33_ATTEMPT,
    m01rCorrections: {
      required: 22,
      records: m01rRows,
      pass: m01rRows.every((record) => {
        const evidence = analyze(record.query);
        return evidence.decision === record.expectedDecision
          && evidence.reasonCode === record.expectedReason;
      }),
    },
    generalization: {
      required: generalizationRows.length,
      records: generalizationRows,
      pass: generalizationRows.every((record) => record.c33Pass),
    },
    leaveOneFamilyOut: {
      required: leaveOneFamilyOutRows.length,
      records: leaveOneFamilyOutRows,
      pass: leaveOneFamilyOutRows.every((record) => record.c33Pass),
    },
    procedureAndComputationExclusions: c33.generalization.rows
      .filter((record) => record.category === 'nearMisses')
      .map((record) => ({
        query: record.query,
        signature: C.outputSignature(analyze(record.query)),
      })),
    treatmentFamily,
    frozenGates: base.gates,
    pass: true,
  };
  const prior = {
    unit: UNIT,
    generatedUtc: C.now(),
    exactActiveBase: base.identity.servicesTreeDigest,
    priorCorrectRows: priorCorrectRows.length,
    records: priorCorrectRows,
    selectedC33Result: C.rel(C33_RESULT),
    pass: true,
  };
  const baselinePath = artifact('M01R_PRESERVATION_BASELINE.json');
  const priorPath = artifact('PRIOR_ACCEPTED_RULE_PRESERVATION.json');
  writeOnceJson(baselinePath, baseline);
  writeOnceJson(priorPath, prior);
  return {
    ...baseline,
    priorCorrectRows,
    files: [baselinePath, priorPath],
  };
}

function evaluatePreservation(preservation, analyze) {
  const compareRecords = (records) => records.flatMap((record) => {
    const actualSignature = C.outputSignature(analyze(record.query));
    return actualSignature === record.signature || actualSignature === record.selectedSignature
      ? []
      : [{
        oracleId: record.oracleId || null,
        query: record.query,
        expectedSignature: record.signature || record.selectedSignature,
        actualSignature,
      }];
  });
  const m01rChanges = compareRecords(preservation.m01rCorrections.records);
  const generalizationChanges = compareRecords(preservation.generalization.records);
  const leaveOneFamilyOutChanges = compareRecords(preservation.leaveOneFamilyOut.records);
  const procedureAndComputationChanges = compareRecords(
    preservation.procedureAndComputationExclusions,
  );
  const priorCorrectChanges = compareRecords(preservation.priorCorrectRows);
  return {
    m01rRequired: preservation.m01rCorrections.required,
    m01rChanges,
    generalizationRequired: preservation.generalization.required,
    generalizationChanges,
    leaveOneFamilyOutRequired: preservation.leaveOneFamilyOut.required,
    leaveOneFamilyOutChanges,
    procedureAndComputationChanges,
    priorCorrectRequired: preservation.priorCorrectRows.length,
    priorCorrectChanges,
    pass: m01rChanges.length === 0
      && generalizationChanges.length === 0
      && leaveOneFamilyOutChanges.length === 0
      && procedureAndComputationChanges.length === 0
      && priorCorrectChanges.length === 0,
  };
}

function freezeHypotheses(base, residual) {
  const familyCounts = HYPOTHESES.reduce((counts, record) => {
    const key = record.frontier;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const out = {
    unit: UNIT,
    generatedUtc: C.now(),
    activeBase: base.identity,
    residualInventory: C.rel(residual.files.inventory),
    requiredCounts: {
      no_tax_relation_vs_explicit_non_tax_task: 8,
      explicit_tax_task_relation: 5,
      tax_treatment_of_ordinary_object: 3,
      tax_compliance_task: 2,
    },
    actualCounts: familyCounts,
    total: HYPOTHESES.length,
    materialCandidateBudget: 6,
    materialCandidateOrder: CANDIDATES.map((candidate, index) => ({
      ordinal: index + 1,
      candidateId: candidate.id,
      principle: candidate.principle,
      forecastCorrections: candidate.forecastCorrections,
      activeBasePolicy: 'exact cumulative accepted base at allocation',
    })),
    hypotheses: HYPOTHESES,
    prohibitedUnchangedCandidates: [
      'C33 M02R',
      'C33 M01R plus M02R composition',
      'C32/C33 M03',
      'broad noun-phrase no-relation routing',
      'declarative non-tax expansion routing',
    ],
    pass: HYPOTHESES.length === 18
      && familyCounts.no_tax_relation_vs_explicit_non_tax_task === 8
      && familyCounts.explicit_tax_task_relation === 5
      && familyCounts.tax_treatment_of_ordinary_object === 3
      && familyCounts.tax_compliance_task === 2
      && CANDIDATES.length === 6,
  };
  C.requirePass(out.pass, 'C34_HYPOTHESIS_LEDGER_INCOMPLETE');
  const file = artifact('CANDIDATE_HYPOTHESES.json');
  writeOnceJson(file, out);
  checkpoint({
    stage: 'R7 hypotheses frozen',
    status: 'COMPLETED',
    activeBaseHash: base.identity.servicesTreeDigest,
    attemptId: base.attempt.attemptId,
    artifacts: [file],
    nextExactOperation: `Execute material candidate 1 of ${CANDIDATES.length} against the exact cumulative active base.`,
    safeToResume: true,
  });
  return { ...out, file };
}

function fullHeadPatch(candidateDirectory, attemptDirectory) {
  const headDirectory = path.join(attemptDirectory, 'starting-head-runtime');
  fs.mkdirSync(headDirectory, { recursive: false });
  for (const name of L.SERVICES) {
    fs.writeFileSync(
      path.join(headDirectory, name),
      C.gitShowBuffer(C.START_HEAD, `services/${name}`),
    );
  }
  const patch = C.canonicalPatch(headDirectory, candidateDirectory);
  C.requirePass(patch.pass, 'C34_FULL_HEAD_PATCH_INVALID');
  const patchFile = path.join(attemptDirectory, 'FULL_HEAD_DIFF.patch');
  writeOnceText(patchFile, patch.text);
  const replay = C.dualEnvironmentReplay(
    headDirectory,
    candidateDirectory,
    patch,
    'full_head',
    {
      identityPolicy: 'normalized_all_changed_raw_exact',
      throwOnFailure: false,
    },
  );
  const replayFile = path.join(attemptDirectory, 'FULL_HEAD_REPLAY.json');
  writeOnceJson(replayFile, replay);
  C.requirePass(replay.pass, 'C34_FULL_HEAD_REPLAY_INVALID');
  return {
    ...patch,
    text: undefined,
    file: C.rel(patchFile),
    replayFile: C.rel(replayFile),
    replay,
  };
}

async function runMaterialCandidate(
  candidate,
  ordinal,
  active,
  preservation,
  {
    allocationCycle = candidate.cycle,
    allocationOrdinal = ordinal,
    retryOf = null,
    retryReason = null,
    retryType = null,
  } = {},
) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), `tina-c34-candidate-${ordinal}-`));
  const materialized = path.join(temporaryRoot, 'runtime');
  let attempt = null;
  try {
    const materializedIdentity = C.materializeCandidate(
      active.dir,
      materialized,
      [candidate.block],
    );
    C.requirePass(
      materializedIdentity.servicesTreeDigest !== active.identity.servicesTreeDigest,
      `C34_CANDIDATE_NO_RUNTIME_CHANGE_${candidate.id}`,
    );
    attempt = C.allocateAttempt({
      category: 'domain_campaign',
      gate: GATE_NAME,
      cycle: allocationCycle,
      ordinal: allocationOrdinal,
      retryOf,
      retryReason,
      retryType,
      semanticBase: {
        attemptId: active.attemptId,
        candidateId: active.candidateId,
        servicesTreeDigest: active.identity.servicesTreeDigest,
        reasonPassed: active.gates.metrics.reasonPassed,
      },
      runtimeDirectory: materialized,
    });
    C.appendAttemptLog(
      attempt,
      'stdout',
      `Allocated ${candidate.id} against cumulative base ${active.identity.servicesTreeDigest}.`
        + (retryOf ? ` Linked technical retry of ${retryOf}: ${retryReason}.` : ''),
    );
    if (retryOf) {
      checkpoint({
        stage: 'linked retry allocation',
        status: 'ALLOCATED_NEW_DISTINCT_ATTEMPT',
        activeBaseHash: active.identity.servicesTreeDigest,
        attemptId: attempt.attemptId,
        artifacts: [
          path.join(attempt.dir, 'ATTEMPT.json'),
          artifact('NT01_LINKED_RETRY_AUTHORIZATION.json'),
          artifact('ATTEMPT_ALLOCATION_WAL.ndjson'),
          REGISTRY,
        ],
        nextExactOperation:
          'Execute the linked NT01 retry once against the exact immutable C33 M01R base.',
        safeToResume: false,
      });
    }
    const snapshot = path.join(attempt.dir, 'runtime-snapshot');
    C.copyRuntime(materialized, snapshot);
    const candidateIdentity = C.runtimeFor(snapshot);
    C.requirePass(
      C.sameRuntime(candidateIdentity, materializedIdentity),
      `C34_CANDIDATE_SNAPSHOT_COPY_DRIFT_${candidate.id}`,
    );
    const identityPath = path.join(snapshot, 'RUNTIME_IDENTITY.json');
    writeOnceJson(identityPath, candidateIdentity);
    const [baseAnalyze, candidateAnalyze] = await Promise.all([
      C.loadAnalyzerFrom(active.dir, `c34-${ordinal}-base`),
      C.loadAnalyzerFrom(snapshot, `c34-${ordinal}-candidate`),
    ]);
    const replay = C.replayAndInheritance(active.dir, snapshot, attempt.dir);
    const fullHead = fullHeadPatch(snapshot, attempt.dir);
    const gates = await C.directGatesForDirectory(snapshot);
    const rowLevel = C.collectRows(baseAnalyze, candidateAnalyze);
    const preservationResult = evaluatePreservation(preservation, candidateAnalyze);
    const generalization = C.executePacket(candidate, baseAnalyze, candidateAnalyze);
    const leaveOneFamilyOut = C.leaveFamilyOut(candidate, candidateAnalyze);
    const controls = C.sentinelShuffleAndTaint(
      candidate,
      candidateAnalyze,
      replay.patchText,
    );
    const featureAblation = await C.featureAblation(
      candidate,
      active.dir,
      snapshot,
      attempt.dir,
    );
    const strictImprovement =
      gates.metrics.reasonPassed > active.gates.metrics.reasonPassed
      && rowLevel.newlyCorrected.length > 0;
    const targetOnlyChanges = rowLevel.changedSignatures.length
      === rowLevel.newlyCorrected.length
      && rowLevel.outsideTarget.length === 0;
    const structuralDiagnosticsStable =
      JSON.stringify(gates.structuralDiagnostics)
        === JSON.stringify(active.gates.structuralDiagnostics);
    const precedence = {
      candidateId: candidate.id,
      insertionSite: 'governed override after all inherited accepted rules and before return null',
      activeBaseDigest: active.identity.servicesTreeDigest,
      candidateDigest: candidateIdentity.servicesTreeDigest,
      changedRows: rowLevel.changedSignatures.length,
      newlyCorrectedRows: rowLevel.newlyCorrected.length,
      outsideCorrectionTarget: rowLevel.outsideTarget,
      inheritedRulesPreserved: preservationResult.pass,
      pass: targetOnlyChanges && preservationResult.pass,
    };
    const promotionChecks = {
      strictReasonImprovement: strictImprovement,
      frozenGatesExact: gates.frozenLocksHeld,
      correctRowRegressionsZero: rowLevel.newlyRegressed.length === 0,
      wrongToDifferentWrongZero: rowLevel.wrongToDifferentWrong.length === 0,
      priorRuleRegressionsZero: preservationResult.priorCorrectChanges.length === 0,
      m01rRegressionsZero: preservationResult.m01rChanges.length === 0,
      decisionRelationDriftZero:
        gates.metrics.decisionPassed === 3720 && gates.metrics.relationPassed === 3720,
      inheritedStructuralDiagnosticsStable: structuralDiagnosticsStable,
      branchDriftOutsideTargetZero: rowLevel.outsideTarget.length === 0,
      dualReplayPass: replay.pass,
      inheritedChangeExclusionPass: replay.computedInheritedChangeExclusion.pass,
      fullHeadReplayPass: fullHead.replay.pass,
      generalizationPass: generalization.pass,
      leaveOneFamilyOutPass: leaveOneFamilyOut.pass,
      sentinelPass: controls.sentinel.pass,
      shufflePass: controls.shuffle.pass,
      taintPass: controls.taint.pass,
      featureAblationPass: featureAblation.pass,
      precedencePass: precedence.pass,
      antiMemorizationPass: gates.antiMemorization.pass,
    };
    const accepted = Object.values(promotionChecks).every(Boolean);
    const failedChecks = Object.entries(promotionChecks)
      .filter(([, pass]) => !pass)
      .map(([name]) => name);
    const disposition = accepted
      ? 'ACCEPTED_PROMOTED_CONTROLLING'
      : `REJECTED_${failedChecks.join('_').toUpperCase()}`;
    const componentFiles = {
      gates: path.join(attempt.dir, 'FROZEN_GATES.json'),
      rowLevel: path.join(attempt.dir, 'ROW_LEVEL_PARETO.json'),
      preservation: path.join(attempt.dir, 'M01R_AND_PRIOR_PRESERVATION.json'),
      generalization: path.join(attempt.dir, 'GENERALIZATION_QUERY_RESULTS.json'),
      leaveOneFamilyOut: path.join(attempt.dir, 'LEAVE_ONE_FAMILY_OUT.json'),
      antiOverfit: path.join(attempt.dir, 'SENTINEL_SHUFFLE_TAINT.json'),
      ablation: path.join(attempt.dir, 'MONOTONIC_FEATURE_ABLATION.json'),
      precedence: path.join(attempt.dir, 'PRECEDENCE_TRACE.json'),
    };
    writeOnceJson(componentFiles.gates, gates);
    writeOnceJson(componentFiles.rowLevel, rowLevel);
    writeOnceJson(componentFiles.preservation, preservationResult);
    writeOnceJson(componentFiles.generalization, generalization);
    writeOnceJson(componentFiles.leaveOneFamilyOut, leaveOneFamilyOut);
    writeOnceJson(componentFiles.antiOverfit, controls);
    writeOnceJson(componentFiles.ablation, featureAblation);
    writeOnceJson(componentFiles.precedence, precedence);
    const result = {
      unit: UNIT,
      generatedUtc: C.now(),
      attemptId: attempt.attemptId,
      ordinal,
      candidateOrdinal: ordinal,
      attemptOrdinal: allocationOrdinal,
      allocationCycle,
      retryOf,
      retryReason,
      retryType,
      candidateId: candidate.id,
      frontier: candidate.frontier,
      principle: candidate.principle,
      observablePredicate: candidate.observablePredicate,
      forecastCorrections: candidate.forecastCorrections,
      activeBase: {
        attemptId: active.attemptId,
        candidateId: active.candidateId,
        identity: active.identity,
        metrics: active.gates.metrics,
      },
      candidateIdentity,
      metrics: gates.metrics,
      gates,
      replay: { ...replay, patchText: undefined },
      fullHeadDiff: fullHead,
      generalization,
      leaveOneFamilyOut,
      sentinel: controls.sentinel,
      shuffle: controls.shuffle,
      taint: controls.taint,
      featureAblation,
      antiMemorization: gates.antiMemorization,
      preservation: preservationResult,
      rowLevel,
      precedence,
      promotionChecks,
      failedChecks,
      accepted,
      disposition,
    };
    const resultPath = path.join(attempt.dir, 'ITERATION_RESULT.json');
    writeOnceJson(resultPath, result);
    C.appendAttemptLog(
      attempt,
      'stdout',
      `${disposition}; reason ${active.gates.metrics.reasonPassed} -> ${gates.metrics.reasonPassed}; corrected=${rowLevel.newlyCorrected.length}; regressions=${rowLevel.newlyRegressed.length}.`,
    );
    const resultPaths = [
      resultPath,
      identityPath,
      path.join(attempt.dir, 'C34_CANDIDATE_DELTA_REPLAY.json'),
      path.join(attempt.dir, 'C34_ONLY_CANDIDATE.patch'),
      abs(fullHead.file),
      abs(fullHead.replayFile),
      ...Object.values(componentFiles),
    ];
    C.finalizeAttempt(attempt, { disposition, resultPaths });
    removeOwnedTemp(temporaryRoot, `tina-c34-candidate-${ordinal}-`);
    const selected = accepted
      ? {
        attemptId: attempt.attemptId,
        candidateId: candidate.id,
        dir: snapshot,
        identity: candidateIdentity,
        gates,
      }
      : active;
    if (retryOf) {
      checkpoint({
        stage: 'linked retry execution',
        status: 'COMPLETED_ALL_SEMANTIC_AND_REPLAY_CONTROLS',
        activeBaseHash: selected.identity.servicesTreeDigest,
        attemptId: attempt.attemptId,
        artifacts: [
          resultPath,
          path.join(attempt.dir, 'C34_CANDIDATE_DELTA_REPLAY.json'),
          abs(fullHead.replayFile),
          ...Object.values(componentFiles),
        ],
        nextExactOperation: 'Record the precise linked retry semantic disposition.',
        safeToResume: true,
      });
      checkpoint({
        stage: 'linked retry disposition',
        status: accepted ? 'ACCEPTED_PROMOTED' : 'COMPLETED_SEMANTIC_REJECTION',
        activeBaseHash: selected.identity.servicesTreeDigest,
        attemptId: attempt.attemptId,
        artifacts: [resultPath, path.join(attempt.dir, 'ATTEMPT.json'), REGISTRY],
        nextExactOperation:
          'Reconcile registry and WAL, confirm the cumulative active base, then continue original C34 candidates 2-6.',
        safeToResume: true,
      });
    } else {
      checkpoint({
        stage: `material candidate ${ordinal} of ${CANDIDATES.length}`,
        status: accepted ? 'ACCEPTED_PROMOTED' : 'COMPLETED_REJECTED',
        activeBaseHash: selected.identity.servicesTreeDigest,
        attemptId: attempt.attemptId,
        artifacts: [resultPath, ...Object.values(componentFiles)],
        nextExactOperation: ordinal < CANDIDATES.length
          ? `Execute material candidate ${ordinal + 1} against the exact cumulative accepted base.`
          : 'Execute the single cumulative composition and order-independence attempt.',
        safeToResume: true,
      });
    }
    return { ...result, attempt, dir: snapshot, selected };
  } catch (error) {
    terminalizeTechnical(attempt, error, candidate.id);
    if (retryOf && attempt && C.readJson(path.join(attempt.dir, 'ATTEMPT.json')).status === 'technical_failure') {
      checkpoint({
        stage: 'linked retry disposition',
        status: 'BLOCKED_TECHNICAL_INCOMPLETE',
        activeBaseHash: active.identity.servicesTreeDigest,
        attemptId: attempt.attemptId,
        artifacts: [
          path.join(attempt.dir, 'ATTEMPT.json'),
          path.join(attempt.dir, 'TECHNICAL_FAILURE.json'),
          REGISTRY,
          artifact('ATTEMPT_ALLOCATION_WAL.ndjson'),
        ],
        nextExactOperation:
          'Stop. Preserve the linked retry technical failure; do not continue candidates 2-6.',
        safeToResume: false,
        blocker: 'C34_LINKED_RETRY_TECHNICAL_FAILURE',
      });
    }
    throw error;
  } finally {
    if (fs.existsSync(temporaryRoot)) {
      removeOwnedTemp(temporaryRoot, `tina-c34-candidate-${ordinal}-`);
    }
  }
}

async function runComposition(initialBase, active, candidateResults) {
  const acceptedResults = candidateResults.filter((result) => result.accepted);
  let attempt = null;
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tina-c34-composition-'));
  try {
    attempt = C.allocateAttempt({
      category: 'domain_campaign',
      gate: GATE_NAME,
      cycle: 'compose',
      ordinal: 1,
      semanticBase: {
        sourceAttempt: initialBase.attempt.attemptId,
        activeAttempt: active.attemptId,
        acceptedCandidateIds: acceptedResults.map((result) => result.candidateId),
        servicesTreeDigest: active.identity.servicesTreeDigest,
      },
      runtimeDirectory: active.dir,
    });
    C.appendAttemptLog(
      attempt,
      'stdout',
      `Composition attempt for ${acceptedResults.length} accepted C34 rules.`,
    );
    const forward = path.join(attempt.dir, 'runtime-snapshot');
    C.copyRuntime(active.dir, forward);
    const forwardIdentity = C.runtimeFor(forward);
    writeOnceJson(path.join(forward, 'RUNTIME_IDENTITY.json'), forwardIdentity);
    if (acceptedResults.length === 0) {
      const result = {
        unit: UNIT,
        generatedUtc: C.now(),
        attemptId: attempt.attemptId,
        candidateId: 'C34-COMPOSITION-NO-ACCEPTED-CANDIDATES',
        acceptedCandidateIds: [],
        disposition: 'COMPLETED_NO_ACCEPTED_C34_RULES_TO_COMPOSE',
        orderDrift: [],
        shadowing: [],
        pass: true,
      };
      const resultPath = path.join(attempt.dir, 'ITERATION_RESULT.json');
      writeOnceJson(resultPath, result);
      C.appendAttemptLog(attempt, 'stdout', result.disposition);
      C.finalizeAttempt(attempt, {
        disposition: result.disposition,
        resultPaths: [resultPath, path.join(forward, 'RUNTIME_IDENTITY.json')],
      });
      checkpoint({
        stage: 'composition and precedence',
        status: 'COMPLETED_NO_ACCEPTED_RULES',
        activeBaseHash: active.identity.servicesTreeDigest,
        attemptId: attempt.attemptId,
        artifacts: [resultPath],
        nextExactOperation: 'Finalize aggregate evidence, registry, service restoration, and pre-review report.',
        safeToResume: true,
      });
      return { ...result, attempt, rowLevel: null, replay: null };
    }
    const reverseMaterialized = path.join(temporaryRoot, 'reverse-runtime');
    C.materializeCandidate(
      initialBase.dir,
      reverseMaterialized,
      acceptedResults.slice().reverse().map((result) =>
        CANDIDATES.find((candidate) => candidate.id === result.candidateId).block),
    );
    const reverse = path.join(attempt.dir, 'reverse-order-runtime');
    C.copyRuntime(reverseMaterialized, reverse);
    const reverseIdentity = C.runtimeFor(reverse);
    writeOnceJson(path.join(reverse, 'RUNTIME_IDENTITY.json'), reverseIdentity);
    const [baseAnalyze, forwardAnalyze, reverseAnalyze] = await Promise.all([
      C.loadAnalyzerFrom(initialBase.dir, 'c34-composition-base'),
      C.loadAnalyzerFrom(forward, 'c34-composition-forward'),
      C.loadAnalyzerFrom(reverse, 'c34-composition-reverse'),
    ]);
    const [forwardGates, reverseGates] = await Promise.all([
      C.directGatesForDirectory(forward),
      C.directGatesForDirectory(reverse),
    ]);
    const comparisonQueries = [...new Set([
      ...L.loadR3().map((row) => row.query),
      ...acceptedResults.flatMap((result) => {
        const candidate = CANDIDATES.find((item) => item.id === result.candidateId);
        return [
          ...Object.values(candidate.packet).flat(),
          ...candidate.leaveFamilyOut,
        ];
      }),
    ])];
    const orderDrift = comparisonQueries.flatMap((query) => {
      const forwardSignature = C.outputSignature(forwardAnalyze(query));
      const reverseSignature = C.outputSignature(reverseAnalyze(query));
      return forwardSignature === reverseSignature
        ? []
        : [{ query, forwardSignature, reverseSignature }];
    });
    const shadowing = acceptedResults.flatMap((result) =>
      result.rowLevel.newlyCorrected.flatMap((record) => {
        const evidence = forwardAnalyze(record.query);
        return evidence.reasonCode === record.expectedReason
          && evidence.decision === record.expectedDecision
          ? []
          : [{
            candidateId: result.candidateId,
            oracleId: record.oracleId,
            query: record.query,
            expectedReason: record.expectedReason,
            actual: C.compactEvidence(evidence),
          }];
      }));
    const rowLevel = C.collectRows(baseAnalyze, forwardAnalyze);
    const replay = C.replayAndInheritance(initialBase.dir, forward, attempt.dir);
    const fullHead = fullHeadPatch(forward, attempt.dir);
    const pass = C.sameRuntime(forwardIdentity, active.identity)
      && forwardGates.frozenLocksHeld
      && reverseGates.frozenLocksHeld
      && orderDrift.length === 0
      && shadowing.length === 0
      && rowLevel.newlyRegressed.length === 0
      && rowLevel.wrongToDifferentWrong.length === 0
      && replay.pass
      && fullHead.replay.pass;
    const result = {
      unit: UNIT,
      generatedUtc: C.now(),
      attemptId: attempt.attemptId,
      candidateId: 'C34-CUMULATIVE-ACCEPTED-RULE-COMPOSITION',
      acceptedCandidateIds: acceptedResults.map((record) => record.candidateId),
      forwardIdentity,
      reverseIdentity,
      forwardGates,
      reverseGates,
      comparisonQueryCount: comparisonQueries.length,
      orderDrift,
      shadowing,
      rowLevel,
      replay: { ...replay, patchText: undefined },
      fullHeadDiff: fullHead,
      disposition: pass
        ? 'ACCEPTED_CUMULATIVE_ORDER_INDEPENDENT'
        : 'REJECTED_COMPOSITION_OR_ORDER_INTERFERENCE',
      pass,
    };
    const resultPath = path.join(attempt.dir, 'ITERATION_RESULT.json');
    const orderPath = path.join(attempt.dir, 'COMPOSITION_ORDER_INDEPENDENCE.json');
    const rowPath = path.join(attempt.dir, 'COMPOSITION_ROW_DELTA.json');
    writeOnceJson(orderPath, {
      attemptId: attempt.attemptId,
      acceptedCandidateIds: result.acceptedCandidateIds,
      forwardIdentity,
      reverseIdentity,
      forwardMetrics: forwardGates.metrics,
      reverseMetrics: reverseGates.metrics,
      orderDrift,
      shadowing,
      pass,
    });
    writeOnceJson(rowPath, rowLevel);
    writeOnceJson(resultPath, result);
    C.appendAttemptLog(
      attempt,
      'stdout',
      `${result.disposition}; accepted rules=${acceptedResults.length}; order drift=${orderDrift.length}; shadowing=${shadowing.length}.`,
    );
    C.finalizeAttempt(attempt, {
      disposition: result.disposition,
      resultPaths: [
        resultPath,
        orderPath,
        rowPath,
        path.join(forward, 'RUNTIME_IDENTITY.json'),
        path.join(reverse, 'RUNTIME_IDENTITY.json'),
        path.join(attempt.dir, 'C34_CANDIDATE_DELTA_REPLAY.json'),
        path.join(attempt.dir, 'C34_ONLY_CANDIDATE.patch'),
        abs(fullHead.file),
        abs(fullHead.replayFile),
      ],
    });
    C.requirePass(pass, 'C34_ACCEPTED_RULE_COMPOSITION_FAILED');
    checkpoint({
      stage: 'composition and precedence',
      status: 'COMPLETED_PASS',
      activeBaseHash: active.identity.servicesTreeDigest,
      attemptId: attempt.attemptId,
      artifacts: [resultPath, orderPath, rowPath],
      nextExactOperation: 'Finalize aggregate evidence, registry, service restoration, and the pre-review report.',
      safeToResume: true,
    });
    return { ...result, attempt };
  } catch (error) {
    terminalizeTechnical(attempt, error, 'cumulative composition and order');
    throw error;
  } finally {
    if (fs.existsSync(temporaryRoot)) {
      removeOwnedTemp(temporaryRoot, 'tina-c34-composition-');
    }
  }
}

function aggregateEvidence(initialBase, active, candidateResults, composition, preservation) {
  const material = candidateResults;
  const accepted = material.filter((result) => result.accepted);
  const write = (name, value) => {
    const file = artifact(name);
    writeOnceJson(file, value);
    return file;
  };
  const aggregateFiles = [];
  aggregateFiles.push(write('RULE_GENERALIZATION_PACKETS.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => ({
      candidateId: result.candidateId,
      attemptId: result.attemptId,
      requirements: result.generalization.requirements,
      counts: result.generalization.counts,
      copiedFrozenQueries: result.generalization.copiedFrozenQueries,
      duplicatedQueries: result.generalization.duplicatedQueries,
      pass: result.generalization.pass,
    })),
    pass: accepted.every((result) => result.generalization.pass),
  }));
  aggregateFiles.push(write('GENERALIZATION_QUERY_RESULTS.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => result.generalization),
    acceptedCandidatesPass: accepted.every((result) => result.generalization.pass),
  }));
  aggregateFiles.push(write('LEAVE_ONE_FAMILY_OUT_RESULTS.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => result.leaveOneFamilyOut),
    pass: accepted.every((result) => result.leaveOneFamilyOut.pass),
  }));
  aggregateFiles.push(write('SENTINEL_SUBSTITUTION_RESULT.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => result.sentinel),
    pass: accepted.every((result) => result.sentinel.pass),
  }));
  aggregateFiles.push(write('INDEPENDENT_ROW_SHUFFLE_RESULT.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => result.shuffle),
    pass: accepted.every((result) => result.shuffle.pass),
  }));
  aggregateFiles.push(write('TAINT_SOURCE_TO_RUNTIME_SINK_MAP.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    sourceTaints: [
      'oracle ID',
      'query hash',
      'expected decision/reason/relation',
      'source set',
      'family',
      'row order',
      'fixture membership',
    ],
    runtimeSink: 'pure governed reason override in philippine-tax-intent-analyzer.js',
    candidates: material.map((result) => result.taint),
    pass: accepted.every((result) => result.taint.pass),
  }));
  aggregateFiles.push(write('TAINT_AWARE_ANTI_OVERFIT_RESULT.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => ({
      candidateId: result.candidateId,
      accepted: result.accepted,
      antiMemorization: result.antiMemorization,
      sentinelPass: result.sentinel.pass,
      shufflePass: result.shuffle.pass,
      taintPass: result.taint.pass,
      pass: result.antiMemorization.pass
        && result.sentinel.pass
        && result.shuffle.pass
        && result.taint.pass,
    })),
    pass: accepted.every((result) =>
      result.antiMemorization.pass
      && result.sentinel.pass
      && result.shuffle.pass
      && result.taint.pass),
  }));
  aggregateFiles.push(write('ROW_LEVEL_PARETO_COMPARISON.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => ({
      candidateId: result.candidateId,
      attemptId: result.attemptId,
      accepted: result.accepted,
      baseCorrect: result.rowLevel.baseCorrect,
      candidateCorrect: result.rowLevel.candidateCorrect,
      newlyCorrected: result.rowLevel.newlyCorrected,
      newlyRegressed: result.rowLevel.newlyRegressed,
      pass: result.rowLevel.newlyRegressed.length === 0,
    })),
    composition: composition.rowLevel,
    pass: accepted.every((result) => result.rowLevel.newlyRegressed.length === 0),
  }));
  aggregateFiles.push(write('WRONG_TO_DIFFERENT_WRONG.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => ({
      candidateId: result.candidateId,
      rows: result.rowLevel.wrongToDifferentWrong,
      pass: result.rowLevel.wrongToDifferentWrong.length === 0,
    })),
    compositionRows: composition.rowLevel?.wrongToDifferentWrong || [],
    pass: accepted.every((result) => result.rowLevel.wrongToDifferentWrong.length === 0)
      && (composition.rowLevel?.wrongToDifferentWrong || []).length === 0,
  }));
  aggregateFiles.push(write('PRIOR_OVERRIDE_REGRESSION.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => ({
      candidateId: result.candidateId,
      rows: result.preservation.priorCorrectChanges,
      pass: result.preservation.priorCorrectChanges.length === 0,
    })),
    pass: accepted.every((result) => result.preservation.priorCorrectChanges.length === 0),
  }));
  aggregateFiles.push(write('M01R_REGRESSION.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    m01rRequired: preservation.m01rCorrections.required,
    generalizationRequired: preservation.generalization.required,
    leaveOneFamilyOutRequired: preservation.leaveOneFamilyOut.required,
    candidates: material.map((result) => ({
      candidateId: result.candidateId,
      m01rChanges: result.preservation.m01rChanges,
      generalizationChanges: result.preservation.generalizationChanges,
      leaveOneFamilyOutChanges: result.preservation.leaveOneFamilyOutChanges,
      procedureAndComputationChanges: result.preservation.procedureAndComputationChanges,
      pass: result.preservation.pass,
    })),
    pass: accepted.every((result) => result.preservation.pass),
  }));
  aggregateFiles.push(write('BRANCH_SIGNATURE_DRIFT.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    signature:
      'decision + final reason + ordered full relation tuples; candidate insertion is a pure terminating override',
    candidates: material.map((result) => ({
      candidateId: result.candidateId,
      changedSignatures: result.rowLevel.changedSignatures,
      rowsOutsideCorrectionTarget: result.rowLevel.outsideTarget,
      pass: result.rowLevel.outsideTarget.length === 0,
    })),
    pass: accepted.every((result) => result.rowLevel.outsideTarget.length === 0),
  }));
  const baseSource = fs.readFileSync(
    path.join(initialBase.dir, 'philippine-tax-intent-analyzer.js'),
    'utf8',
  );
  const featureNames = [...baseSource.matchAll(/\bconst\s+([A-Za-z][A-Za-z0-9_]*)\s*=/g)]
    .map((match) => match[1]);
  aggregateFiles.push(write('MONOTONIC_FEATURE_BASELINE.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    activeBaseIdentity: initialBase.identity,
    declaredFeatureCount: featureNames.length,
    declaredFeatureInventorySha256: C.sha(Buffer.from(featureNames.join('\n'))),
    inheritedFeaturesPreservedByAllAcceptedCandidates:
      accepted.every((result) => result.featureAblation.noInheritedFeatureRemoval),
    treatmentFamily: preservation.treatmentFamily,
    pass: true,
  }));
  aggregateFiles.push(write('MONOTONIC_FEATURE_ABLATION.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => result.featureAblation),
    pass: accepted.every((result) => result.featureAblation.pass),
  }));
  aggregateFiles.push(write('COMPOSITION_ORDER_INDEPENDENCE.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    attemptId: composition.attemptId,
    acceptedCandidateIds: composition.acceptedCandidateIds,
    forwardIdentity: composition.forwardIdentity || active.identity,
    reverseIdentity: composition.reverseIdentity || active.identity,
    orderDrift: composition.orderDrift,
    shadowing: composition.shadowing,
    pass: composition.pass,
  }));
  aggregateFiles.push(write('COMPOSITION_ROW_DELTA.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    attemptId: composition.attemptId,
    rowLevel: composition.rowLevel,
    pass: composition.rowLevel ? composition.rowLevel.pass : true,
  }));
  aggregateFiles.push(write('CANDIDATE_DELTA_REPLAY_RESULT.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    candidates: material.map((result) => ({
      candidateId: result.candidateId,
      attemptId: result.attemptId,
      accepted: result.accepted,
      replay: result.replay,
    })),
    composition: composition.replay,
    pass: material.every((result) => result.replay.pass)
      && (!composition.replay || composition.replay.pass),
  }));
  aggregateFiles.push(write('FULL_HEAD_REPLAY_RESULT.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    identityPolicy:
      'normalized_all_changed_raw_exact: normalized identity for all services, raw identity for the exact patch-changed set, and exact raw HEAD restoration after reverse replay',
    candidates: material.map((result) => ({
      candidateId: result.candidateId,
      attemptId: result.attemptId,
      accepted: result.accepted,
      fullHeadDiff: result.fullHeadDiff,
      pass: result.fullHeadDiff?.replay?.pass === true,
    })),
    composition: composition.fullHeadDiff || null,
    pass: material.every((result) => result.fullHeadDiff?.replay?.pass === true)
      && (!composition.fullHeadDiff || composition.fullHeadDiff.replay?.pass === true),
  }));
  const specPath = artifact('PATCH_PATH_CANONICALIZATION_SPEC.md');
  writeOnceText(
    specPath,
    `# C34 canonical replay contract

Every candidate-only and cumulative patch contains only:

\`diff --git a/services/<file> b/services/<file>\`
\`--- a/services/<file>\`
\`+++ b/services/<file>\`

Forward and reverse replay run in an isolated non-repository directory and an
isolated clean Git repository worktree. Candidate-only replay requires exact
bytes and raw SHA-256 for every service. Full-HEAD replay requires normalized-LF
identity for every service, exact bytes/raw SHA-256 for every patch-changed
service, and exact raw starting-HEAD restoration after reverse replay. This
explicitly preserves HEAD LF bytes for normalized-unchanged files when an
immutable candidate snapshot uses CRLF. Both policies require exact changed-path
sets and zero skipped, no-op, or unexpected files. A detached checkout is not
materializable on Windows because immutable history contains reserved \`nul\`
and \`CON\` paths; the clean worktree therefore commits exact active-base bytes
reconstructed from governed Git blobs before replay.
`,
  );
  aggregateFiles.push(specPath);
  const exhaustion = {
    unit: UNIT,
    generatedUtc: C.now(),
    reconstructionAttempts: 1,
    materialBudget: 6,
    materialCandidatesExecuted: material.length,
    acceptedCandidates: accepted.map((result) => result.candidateId),
    rejectedCandidates: material.filter((result) => !result.accepted).map((result) => ({
      candidateId: result.candidateId,
      disposition: result.disposition,
      failedChecks: result.failedChecks,
    })),
    compositionAttempts: 1,
    reasonLockVerificationAllocated: active.gates.metrics.reasonPassed === 3720,
    remainingReasonMismatches: active.gates.metrics.reasonMismatches,
    remainingViableCandidates: active.gates.metrics.reasonPassed < 3720,
    formalExhaustion: false,
    confirmedAmbiguity: false,
    nextPath:
      active.gates.metrics.reasonPassed === 3720
        ? 'C35 standalone runtime closure and exact-gate verification'
        : accepted.length
          ? 'C35 R3 reason-layer continuation against the C34 selected runtime'
          : 'C35 structural reassessment against the C33 M01R base',
    pass: material.length === 6,
  };
  const exhaustionPath = write('CANDIDATE_EXHAUSTION.json', exhaustion);
  aggregateFiles.push(exhaustionPath);
  const reasonLockPath = write('REASON_LOCK_VERIFICATION_DISPOSITION.json', {
    unit: UNIT,
    generatedUtc: C.now(),
    reasonPassed: active.gates.metrics.reasonPassed,
    requiredForAllocation: 3720,
    allocated: false,
    reason:
      active.gates.metrics.reasonPassed === 3720
        ? 'ERROR: caller must allocate the separately registered reason-lock attempt'
        : 'Not authorized because cumulative R3 reason closure was not reached.',
    pass: active.gates.metrics.reasonPassed < 3720,
  });
  aggregateFiles.push(reasonLockPath);
  C.requirePass(
    active.gates.metrics.reasonPassed < 3720,
    'C34_REASON_LOCK_REACHED_BUT_NOT_ALLOCATED',
  );
  return { files: aggregateFiles, exhaustion, accepted };
}

function makeEvidenceManifest(file, { includeKnowledge = true } = {}) {
  const resultsRoot = path.resolve(C.RES);
  const top = fs.readdirSync(resultsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('COMMIT_5R1C34_'))
    .map((entry) => path.join(resultsRoot, entry.name));
  const attempts = fs.readdirSync(path.join(resultsRoot, 'attempts'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .flatMap((entry) => C.recursiveFiles(path.join(resultsRoot, 'attempts', entry.name)));
  const governed = [
    abs('evaluation/runner/phase-10a14-r20/commit5r1c34-execute.mjs'),
    abs('evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs'),
    abs('evaluation/runner/phase-10a14-r20/commit5r1c20-lib.mjs'),
    abs('evaluation/runner/phase-10a14-r20/commit5r1c20-gates.mjs'),
    abs('evaluation/runner/phase-10a14-r20/commit5r1c33-execute.mjs'),
    abs('evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json'),
    abs('package-lock.json'),
    abs('package.json'),
    ...L.SERVICES.map((name) => abs(`services/${name}`)),
    ...(includeKnowledge ? [abs(ROADMAP), abs(CURRENT_STATE)] : []),
  ];
  const manifestAbsolute = path.resolve(file);
  const files = [...new Set([...top, ...attempts, ...governed].map((item) => path.resolve(item)))]
    .filter((item) => item !== manifestAbsolute)
    .sort((first, second) => C.rel(first).localeCompare(C.rel(second)));
  const lines = files.map((item) => `${C.sha(fs.readFileSync(item))}  ${C.rel(item)}`);
  writeOnceText(manifestAbsolute, `${lines.join('\n')}\n`);
  const verification = lines.map((line) => {
    const [, expected, relative] = /^([0-9a-f]{64})  (.+)$/.exec(line);
    const actual = C.sha(fs.readFileSync(abs(relative)));
    return { relative, expected, actual, pass: expected === actual };
  });
  C.requirePass(verification.every((record) => record.pass), 'C34_MANIFEST_SELF_VERIFICATION_FAILED');
  return {
    path: C.rel(manifestAbsolute),
    entries: lines.length,
    sha256: C.sha(fs.readFileSync(manifestAbsolute)),
    badHashes: verification.filter((record) => !record.pass),
    selfExcluded: true,
  };
}

function verifyEvidenceManifest(file) {
  const absolute = path.resolve(file);
  const bytes = fs.readFileSync(absolute);
  const lines = bytes.toString('utf8').split(/\r?\n/).filter(Boolean);
  const records = lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    C.requirePass(match, `C34_MANIFEST_BAD_LINE_${line}`);
    const target = abs(match[2]);
    const exists = fs.existsSync(target);
    const actualSha256 = exists ? C.sha(fs.readFileSync(target)) : null;
    return {
      path: match[2],
      expectedSha256: match[1],
      actualSha256,
      exists,
      pass: exists && actualSha256 === match[1],
    };
  });
  const duplicatePaths = records.map((record) => record.path)
    .filter((item, index, items) => items.indexOf(item) !== index);
  return {
    path: C.rel(absolute),
    bytes: bytes.length,
    sha256: C.sha(bytes),
    entries: records.length,
    records,
    duplicatePaths: [...new Set(duplicatePaths)],
    badEntries: records.filter((record) => !record.pass),
    pass: records.every((record) => record.pass) && duplicatePaths.length === 0,
  };
}

function nextExactTask(active, acceptedCount) {
  if (active.gates.metrics.reasonPassed === 3720) {
    return 'PHASE-10A14-R20 - COMMIT 5R1-C35 STANDALONE RUNTIME CLOSURE AND EXACT-GATE VERIFICATION';
  }
  if (acceptedCount > 0) {
    return 'PHASE-10A14-R20 - COMMIT 5R1-C35 R3 REASON-LAYER CONTINUATION AGAINST THE C34 SELECTED RUNTIME';
  }
  return 'PHASE-10A14-R20 - COMMIT 5R1-C35 R3 STRUCTURAL REASSESSMENT AGAINST THE EXACT C33 M01R BASE';
}

function prepareKnowledgeFiles({
  active,
  initialBase,
  candidateResults,
  composition,
  registry,
  aggregate,
  serviceRestoration,
  technicalRecovery = null,
}) {
  const accepted = candidateResults.filter((result) => result.accepted);
  const nextTask = nextExactTask(active, accepted.length);
  const dispositions = candidateResults.map((result) =>
    `- ${result.candidateId}: **${result.disposition}**; R3 reason ${result.metrics.reasonPassed}/3,720; newly corrected ${result.rowLevel.newlyCorrected.length}; regressions ${result.rowLevel.newlyRegressed.length}.`)
    .join('\n');
  const technicalRecoveryRoadmap = technicalRecovery
    ? `- Governed technical recovery: NT01 attempt **${technicalRecovery.technicalAttemptId}** has the append-only effective disposition **TECHNICAL_INCOMPLETE_EXECUTOR_STOP** (subcause **FULL_HEAD_PATCH_VALIDATION_FALSE_POSITIVE**); candidate-only replay was preserved/pass. It stopped with **${technicalRecovery.failureCode}** after candidate materialization and dual replay, but before direct R3/frozen/query-level gates and promotion controls, because the full-HEAD patch validator inspected harmless patch-body source text. No semantic disposition was inferred.
- During fail-closed remediation development, two no-allocation header-validator dry-test failures were append-only recorded as checkpoint ordinals 19 and 20. They changed no attempt, registry, allocation WAL, or service bytes and were preserved rather than rewritten.
- After append-only forensic adjudication and a second fail-closed preallocation PASS, new linked retry **${technicalRecovery.linkedRetryAttemptId}** (\`retryOf\` the terminal technical attempt, \`retryType=TECHNICAL_LINKED_RETRY\`) reran every semantic control from the immutable completed reconstruction and ended **${technicalRecovery.linkedRetryDisposition}** at R3 reason **${technicalRecovery.linkedRetryMetrics.reasonPassed}/3,720**. The terminal attempt was not resumed, and no reconstruction, residual inventory, hypothesis ledger, or terminal attempt was overwritten or duplicated.`
    : '';
  const roadmapBefore = fs.readFileSync(ROADMAP, 'utf8');
  const activeStart = roadmapBefore.indexOf('## C33 active execution status');
  const activeEnd = roadmapBefore.indexOf('\n## 1. Controlling strategic decision');
  C.requirePass(activeStart >= 0 && activeEnd > activeStart, 'C34_ROADMAP_C33_SECTION_NOT_FOUND');
  const topLine =
    `**Current controlling result:** COMMIT 5R1-C34 incomplete; R3 reason continuation against the C34 selected runtime is next (${active.gates.metrics.reasonPassed}/3,720 reason, decision/relation locked)`;
  const roadmapTopCorrected = roadmapBefore.replace(
    /^\*\*Current controlling result:\*\*.*$/m,
    topLine,
  );
  const activeSection = `## C34 active execution status

Latest controlling execution result after COMMIT 5R1-C34:

- The executor crash was classified as **CLEAN_NOT_STARTED** after an external R0 forensic capture; no C34 attempt or partial semantic work existed to resume or discard.
- Codex account transfer: prior session **019fa7b7-2d8f-7d21-87c9-d0e7e010ed10** exhausted its account after tooling and shadow validation but before the first governed semantic C34 attempt was allocated. The continuation executor is a new Codex account/session (runtime identity not visible), using **GPT-5.6 Sol**, **Ultra High** reasoning and **Low** speed.
- Account-transfer preallocation validation: **PASS_READY_FOR_FIRST_ATTEMPT**; syntax, static shadow packets, protected-query leakage, path safety, exact runtime identity, isolated forward/reverse replay, process/port state and review-cutover binding were validated before allocation.
${technicalRecoveryRoadmap}
- Exact C33 M01R runtime ${C.C33_IDENTITY.servicesTreeDigest} was reconstructed from immutable committed blobs before any C34 material allocation.
- The 216 remaining reason-only failures were reconciled exactly; reason-suite and collision failures remained zero.
- Six bounded material candidates were executed sequentially against the exact cumulative accepted base; two were on the priority no-tax/actionability frontier.
${dispositions}
- Cumulative composition/order: **${composition.disposition}**; order drift ${composition.orderDrift.length}; shadowing ${composition.shadowing.length}.
- Selected runtime: **${active.candidateId}** in ${active.attemptId}; R3 reason **${active.gates.metrics.reasonPassed} / 3,720**; decision **${active.gates.metrics.decisionPassed} / 3,720**; relation **${active.gates.metrics.relationPassed} / 3,720**.
- Frozen gates: reason suite **${active.gates.metrics.reasonCounterfactualPassed} / 344**; collision **${active.gates.metrics.collisionProbesPassed} / 196**; decision CF **${active.gates.metrics.decisionCounterfactualPassed} / 756**; relation CF **${active.gates.metrics.relationCounterfactualPassed} / 282**; clause **${active.gates.metrics.clauseProbesPassed} / 68**; rich guard **${active.gates.metrics.richContextGuardPassed} / 7**; reason integrity **PASS**.
- Reason layer lock: **${active.gates.metrics.reasonPassed === 3720 ? 'achieved' : 'open'}**; runtime closure: **not achieved**.
- Registry: **${registry.summary.totalAttempts}** attempts; orphan **${registry.summary.orphan}**; dangling **${registry.summary.dangling}**; cumulativeThrough **${registry.cumulativeThrough}**.

Current controlling result: **COMMIT 5R1-C34 incomplete; the governed C34 selected runtime is the next semantic base.**

Next exact task:

**${nextTask}**

No market-response implementation may bypass Phase 10A. Runtime integration, model migration, durable memory, source promotion, production billing, public deployment and production cutover remain blocked until their governed gates pass.

---
`;
  const correctedStart = roadmapTopCorrected.indexOf('## C33 active execution status');
  const correctedEnd = roadmapTopCorrected.indexOf('\n## 1. Controlling strategic decision');
  const roadmapPrepared = (
    roadmapTopCorrected.slice(0, correctedStart)
    + activeSection
    + roadmapTopCorrected.slice(correctedEnd)
  ).replace(/\r\n/g, '\n');
  const roadmapPreparedPath = artifact('PREPARED_ROADMAP_V9.md');
  writeOnceText(roadmapPreparedPath, roadmapPrepared);
  const roadmapPreparedIdentity = {
    path: C.rel(roadmapPreparedPath),
    bytes: fs.statSync(roadmapPreparedPath).size,
    rawSha256: C.sha(fs.readFileSync(roadmapPreparedPath)),
    normalizedLfSha256: C.sha(C.norm(fs.readFileSync(roadmapPreparedPath))),
  };
  const currentBefore = fs.readFileSync(CURRENT_STATE, 'utf8');
  const first = currentBefore.indexOf('## TINA Controlling Continuity Status');
  const second = currentBefore.indexOf('## TINA Controlling Continuity Status', first + 1);
  const historical = second >= 0 ? currentBefore.slice(second) : currentBefore;
  const makeCurrent = (reviewDecision) => `# CURRENT_STATE.md

## TINA Controlling Continuity Status

Last updated: ${C.now()} (COMMIT 5R1-C34)

PHASE-10A14-R20 remains **IN PROGRESS**. Phase 10A remains **OPEN**, not PASS and not SATISFIED.

### COMMIT 5R1-C34 - Crash Recovery and Governed R3 Reason Continuation

- C34 recovery/execution owner: a new Codex account/session (runtime identity not visible), using GPT-5.6 Sol, Ultra High reasoning and Low speed.
- Account-transfer continuity: prior Codex session **019fa7b7-2d8f-7d21-87c9-d0e7e010ed10** exhausted its account after tooling and shadow validation but before the first governed semantic C34 attempt was allocated. This continued the same C34 unit; it did not start C35 and did not duplicate an attempt.
- Account-transfer preallocation validation: **PASS_READY_FOR_FIRST_ATTEMPT** before allocation; syntax, static shadow packets, protected-query leakage, path safety, exact runtime identity, isolated forward/reverse replay, process/port state and review-cutover binding passed.
- Initial crash recovery: external R0 snapshot ${RECOVERY_SNAPSHOT}; process determination **NO_ACTIVE_C34_PROCESS**; commit state **Case A**; local state **CLEAN_NOT_STARTED**; initial resumed semantic stage **R5 exact M01R reconstruction**.
${technicalRecoveryRoadmap}
- Exact C33 selected M01R runtime ${initialBase.identity.servicesTreeDigest} was reconstructed from committed snapshot tree ${C.SELECTED_C33_SNAPSHOT_TREE}. Repository HEAD service content was not used as the semantic candidate base.
- The post-M01R inventory reconciled all 216 reason-only failures: no-tax 133, explicit non-tax 50, explicit tax 27, treatment 5, compliance 1.
- Six material candidates were executed in the governed priority order against the cumulative accepted base:
${dispositions}
- Cumulative composition/order attempt ${composition.attemptId}: **${composition.disposition}**; order drift 0; shadowing 0.
- Selected runtime: **${active.candidateId}** in ${active.attemptId}; services tree ${active.identity.servicesTreeDigest}.
- Final metrics: R3 reason ${active.gates.metrics.reasonPassed}/3,720; mismatches ${active.gates.metrics.reasonMismatches}; decision ${active.gates.metrics.decisionPassed}/3,720; relation ${active.gates.metrics.relationPassed}/3,720.
- Frozen gates: reason suite ${active.gates.metrics.reasonCounterfactualPassed}/344; collision ${active.gates.metrics.collisionProbesPassed}/196; decision CF ${active.gates.metrics.decisionCounterfactualPassed}/756; relation CF ${active.gates.metrics.relationCounterfactualPassed}/282; clause ${active.gates.metrics.clauseProbesPassed}/68; rich guard ${active.gates.metrics.richContextGuardPassed}/7; reason integrity PASS; FA/FR/clarify 0.
- M01R's 22 corrections, its generalization/LFO evidence, procedure/computation exclusions, and all 3,504 previously correct rows were preserved by every promoted candidate.
- Registry: ${registry.summary.totalAttempts} attempts, orphan ${registry.summary.orphan}, dangling ${registry.summary.dangling}, cumulativeThrough ${registry.cumulativeThrough}.
- Independent final reviewer: Claude Code Opus 4.8, read-only, decision **${reviewDecision}**, bound to the exact C34 reviewed-state digest.
- Roadmap v9 prepared/final normalized-LF SHA-256: ${roadmapPreparedIdentity.normalizedLfSha256}. Roadmap v8 and v7 remain unchanged.
- Evidence manifest: evaluation/results/phase-10a14-r20/COMMIT_5R1C34_EVIDENCE_MANIFEST.sha256 (self-excluding, generated after review and knowledge installation).
- Live services were restored to committed starting HEAD with tracked service diff zero: ${serviceRestoration.pass}. Dev factory and protected residue remained outside authorized changes.
- Active runtime model remains **gpt-4o-mini**. GPT-5.6 Terra remains a post-Phase-10A benchmark candidate only; no model migration occurred.
- Reason layer lock remains ${active.gates.metrics.reasonPassed === 3720 ? 'closed' : 'open'}; runtime closure remains false.
- Next exact task: **${nextTask}**.

---

## Historical Continuity Record

${historical.replace(/^# CURRENT_STATE\.md\s*/, '')}`;
  const currentVariants = {};
  for (const decision of ['APPROVED', 'APPROVED_WITH_NONBLOCKING_OBSERVATIONS']) {
    const file = artifact(`PREPARED_CURRENT_STATE_${decision}.md`);
    writeOnceText(file, makeCurrent(decision).replace(/\r\n/g, '\n'));
    currentVariants[decision] = {
      path: C.rel(file),
      bytes: fs.statSync(file).size,
      rawSha256: C.sha(fs.readFileSync(file)),
      normalizedLfSha256: C.sha(C.norm(fs.readFileSync(file))),
    };
  }
  const continuity = {
    unit: UNIT,
    generatedUtc: C.now(),
    roadmap: ROADMAP,
    startingGitBlob: STARTING_ROADMAP_BLOB,
    startingNormalizedLfSha256: STARTING_ROADMAP_NORM,
    prepared: roadmapPreparedIdentity,
    staleTopLevelLineCorrected: !roadmapPrepared.includes('COMMIT 5R1-C32 incomplete'),
    c34ActiveSectionPresent: roadmapPrepared.includes('## C34 active execution status'),
    roadmapV8Unchanged:
      git('diff', '--name-only', 'HEAD', '--', 'knowledge/TINA_Updated_Controlling_Roadmap_v8.md').trim() === '',
    roadmapV7Unchanged:
      git('diff', '--name-only', 'HEAD', '--', 'knowledge/TINA_Updated_Roadmap_v7.md').trim() === '',
    modelContinuity: {
      activeRuntimeModel: 'gpt-4o-mini',
      terraStatus: 'post-Phase-10A benchmark candidate only',
      migrationImplemented: false,
    },
    strategicContinuity: {
      researchFirstV1: true,
      decemberGatedTargetPreserved: true,
      realUsersAccountsPreserved: true,
      controlledPaidAccessPreserved: true,
      securityGatesPreserved: true,
      phase10ABlockerPreserved: true,
      majorPhaseCount: 18,
      phase13TaxOperatingSystemPreserved: true,
      phase14MobilePreserved: true,
    },
    nextTask,
    pass: true,
  };
  const continuityPath = artifact('ROADMAP_V9_CONTINUITY_RECONCILIATION.json');
  writeOnceJson(continuityPath, continuity);
  const planPath = artifact('PREPARED_KNOWLEDGE_INSTALLATION_PLAN.json');
  writeOnceJson(planPath, {
    unit: UNIT,
    generatedUtc: C.now(),
    roadmap: {
      source: C.rel(roadmapPreparedPath),
      target: ROADMAP,
      expectedOldRawSha256: C.sha(fs.readFileSync(ROADMAP)),
      installOrder: 'penultimate substantive knowledge-file change',
    },
    currentStateVariants: currentVariants,
    currentStateTarget: CURRENT_STATE,
    expectedCurrentStateOldRawSha256: C.sha(fs.readFileSync(CURRENT_STATE)),
    installOrder: 'final substantive knowledge-file change',
    reviewerMustApproveExactPreparedBytes: true,
  });
  return {
    nextTask,
    roadmapPreparedPath,
    roadmapPreparedIdentity,
    currentVariants,
    continuity,
    continuityPath,
    planPath,
  };
}

function createReviewSpecification() {
  const specPath = artifact('REVIEW_BINDING_SPEC.json');
  writeOnceJson(specPath, {
    unit: UNIT,
    generatedUtc: C.now(),
    digestDefinition:
      'reviewedStateDigest is the lowercase SHA-256 of the exact COMMIT_5R1C34_PRE_REVIEW_EVIDENCE_MANIFEST.sha256 bytes',
    verification:
      'Before accepting a review, the finalizer must recompute the manifest SHA-256 and verify every manifest entry against the current filesystem.',
    requiredReviewer: {
      tool: 'Claude Code',
      model: 'claude-opus-4-8',
      effort: 'max',
      mode: 'read-only',
      permissionMode: 'plan',
      tools: ['Read', 'Glob', 'Grep', 'Bash'],
      allowedTools: ['Read', 'Glob', 'Grep', 'Bash(sha256sum *)'],
    },
    structuredOutputJsonSchema: CLAUDE_REVIEW_JSON_SCHEMA,
    exactCliArgumentOrder: [
      '-p',
      '<manifest-bound review request plus exact manifest digest>',
      '--model',
      'claude-opus-4-8',
      '--effort',
      'max',
      '--permission-mode',
      'plan',
      '--tools',
      'Read,Glob,Grep,Bash',
      '--allowedTools',
      'Read,Glob,Grep,Bash(sha256sum *)',
      '--no-session-persistence',
      '--output-format',
      'json',
      '--json-schema',
      '<canonical compact structuredOutputJsonSchema JSON>',
    ],
    allowedDecisions: [
      'APPROVED',
      'APPROVED_WITH_NONBLOCKING_OBSERVATIONS',
      'REJECTED',
    ],
    pass: true,
  });
  const requestPath = artifact('INDEPENDENT_REVIEW_REQUEST.md');
  const preReviewReport = C.readJson(artifact('PRE_REVIEW_EXECUTION_REPORT.json'));
  const technicalRecovery = preReviewReport.recovery?.technicalRecovery || null;
  const technicalRecoveryAttemptStartList = technicalRecovery
    ? `- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_TECHNICAL_RECOVERY_PREFLIGHT.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_TECHNICAL_RECOVERY_NT01_IDENTITY_REVALIDATION.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_TECHNICAL_RECOVERY_FAILED_TO_FIXED_RUNNER.patch\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_FULL_HEAD_PATCH_BLOCKER_ROOT_CAUSE.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_FULL_HEAD_PATCH_BLOCKER_ROOT_CAUSE.md\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_FULL_HEAD_PATCH_REMEDIATION_RESULT.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_FULL_HEAD_PATCH_HEADER_VALIDATION.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_FULL_HEAD_PATCH_REPLAY_SELF_TEST.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_NT01_LINKED_RETRY_AUTHORIZATION.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_ATTEMPT_LEDGER_RECONCILIATION.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_FINAL_REGISTRY_WAL_RECONCILIATION.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_ATTEMPT_ALLOCATION_WAL.ndjson\`
- \`evaluation/results/phase-10a14-r20/attempts/${technicalRecovery.technicalAttemptId}/ATTEMPT.json\`
- \`evaluation/results/phase-10a14-r20/attempts/${technicalRecovery.technicalAttemptId}/TECHNICAL_FAILURE.json\`
- \`evaluation/results/phase-10a14-r20/attempts/${technicalRecovery.technicalAttemptId}/EXECUTOR_TECHNICAL_STOP_RECOVERY.json\`
- \`evaluation/results/phase-10a14-r20/attempts/${technicalRecovery.technicalAttemptId}/C34_CANDIDATE_DELTA_REPLAY.json\`
- \`evaluation/results/phase-10a14-r20/attempts/${technicalRecovery.linkedRetryAttemptId}/ATTEMPT.json\`
- \`evaluation/results/phase-10a14-r20/attempts/${technicalRecovery.linkedRetryAttemptId}/ITERATION_RESULT.json\`
- \`evaluation/results/phase-10a14-r20/attempts/${technicalRecovery.linkedRetryAttemptId}/C34_CANDIDATE_DELTA_REPLAY.json\`
- \`evaluation/results/phase-10a14-r20/attempts/${technicalRecovery.linkedRetryAttemptId}/FULL_HEAD_DIFF.patch\`
- \`evaluation/results/phase-10a14-r20/attempts/${technicalRecovery.linkedRetryAttemptId}/FULL_HEAD_REPLAY.json\``
    : '';
  writeOnceText(
    requestPath,
    `# C34 independent final review request

Review COMMIT 5R1-C34 independently and read-only. Do not modify files or support
the implementation. Bash is available only for read-only \`sha256sum\` commands.

Compute the exact reviewed-state digest as the lowercase SHA-256 of:

\`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_PRE_REVIEW_EVIDENCE_MANIFEST.sha256\`

Then verify every entry in that manifest. Return that computed digest unchanged.
Use \`sha256sum <manifest>\` to compute the binding digest and
\`sha256sum -c <manifest>\` to verify every manifest entry. Do not use Bash for
anything else.

Start with:

- \`${C.rel(specPath)}\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_REVIEWED_STATE_INVENTORY.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_PRE_REVIEW_EXECUTION_REPORT.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_EXECUTOR_CRASH_FORENSIC_SNAPSHOT.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_EXECUTOR_CRASH_RECOVERY_DECISION.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_TECHNICAL_BLOCKER.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_TECHNICAL_RECOVERY_FORENSIC_ADJUDICATION.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_TECHNICAL_RECOVERY_PREALLOCATION_VALIDATION.json\`
${technicalRecoveryAttemptStartList}
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_RECOVERY_CHECKPOINT_LOG.ndjson\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_CANDIDATE_HYPOTHESES.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_CANDIDATE_EXHAUSTION.json\`
- \`evaluation/results/phase-10a14-r20/COMMIT_5R1C34_ROADMAP_V9_CONTINUITY_RECONCILIATION.json\`

Verify forensic recovery, no discarded partial work, exact M01R reconstruction,
the **pre-direct-semantic-gates technical failure; candidate-only replay preserved/pass**
and its single new linked retry (the terminal predecessor was not resumed), all new
attempts and registry records, frozen gates, replay, packets/LFO,
anti-overfit, row-level Pareto, feature ablation, composition/order,
service restoration, protected/dev-factory continuity, prepared Roadmap and
CURRENT_STATE bytes, and the pre-review manifest.

Return exactly one allowed decision and bind it to the computed digest. Blocking
findings require REJECTED. Nonblocking observations must not conceal a failed
governance or semantic promotion gate.

Set every structured \`verification\` boolean to true only after independently
verifying root cause, NT01 disposition, registry/WAL consistency, exact retry
linkage including \`retryType\`, header remediation, both dual-replay forms and
their separation, all candidate evidence and frozen gates, prepared Roadmap and
CURRENT_STATE, manifest integrity, and service restoration.
`,
  );
  return { specPath, requestPath };
}

function createReviewedStateInventory(knowledge, specification) {
  const inventory = {
    unit: UNIT,
    generatedUtc: C.now(),
    bindingMethod:
      'This inventory is written before and included in the self-excluding pre-review evidence manifest. The reviewer computes reviewedStateDigest as the SHA-256 of that later manifest file; the digest is deliberately not embedded here, avoiding a circular self-reference.',
    preReviewManifestPath:
      'evaluation/results/phase-10a14-r20/COMMIT_5R1C34_PRE_REVIEW_EVIDENCE_MANIFEST.sha256',
    reviewedStateDigestDefinition:
      'lowercase SHA-256 of the exact pre-review evidence manifest bytes',
    preparedKnowledge: {
      roadmap: knowledge.roadmapPreparedIdentity,
      currentStateVariants: knowledge.currentVariants,
    },
    requiredReviewer: {
      tool: 'Claude Code',
      model: 'claude-opus-4-8',
      reasoning: 'highest available',
      mode: 'read-only',
      tools: ['Read', 'Glob', 'Grep', 'Bash(sha256sum *)'],
    },
    allowedDecisions: [
      'APPROVED',
      'APPROVED_WITH_NONBLOCKING_OBSERVATIONS',
      'REJECTED',
    ],
    pass: true,
  };
  const file = artifact('REVIEWED_STATE_INVENTORY.json');
  writeOnceJson(file, inventory);
  return {
    inventory,
    file,
    specPath: specification.specPath,
    requestPath: specification.requestPath,
  };
}

function verifyTechnicalRecoveryImmutableAnchors(technicalRecovery) {
  const validation = C.readJson(TECHNICAL_RECOVERY_PREALLOCATION);
  const reconstructionDirectory = path.join(
    C.ATT,
    validation.lineage.reconstructionAttemptId,
  );
  const technicalDirectory = path.join(C.ATT, validation.lineage.technicalAttemptId);
  const reconstructionInventory = directoryInventory(reconstructionDirectory);
  const technicalInventory = directoryInventory(technicalDirectory);
  const technicalRecord = C.readJson(path.join(technicalDirectory, 'ATTEMPT.json'));
  const technicalReplay = C.readJson(
    path.join(technicalDirectory, 'C34_CANDIDATE_DELTA_REPLAY.json'),
  );
  const recoveryPreflight = C.readJson(artifact('TECHNICAL_RECOVERY_PREFLIGHT.json'));
  const identityRevalidation = C.readJson(
    artifact('TECHNICAL_RECOVERY_NT01_IDENTITY_REVALIDATION.json'),
  );
  const linkedRetryDirectory = path.join(C.ATT, technicalRecovery.linkedRetryAttemptId);
  const linkedRetryRecord = C.readJson(path.join(linkedRetryDirectory, 'ATTEMPT.json'));
  const linkedRetryResult = C.readJson(
    path.join(linkedRetryDirectory, 'ITERATION_RESULT.json'),
  );
  const registry = C.readJson(REGISTRY);
  const linkedRetries = registry.attempts.filter((attempt) =>
    attempt.retryOf === validation.lineage.technicalAttemptId);
  const prerequisiteArtifactSha256 = Object.fromEntries(
    TECHNICAL_RECOVERY_PREREQUISITE_ARTIFACTS
      .map((name) => [name, C.sha(fs.readFileSync(artifact(name)))]),
  );
  const externalTechnicalFreeze = verifyExternalTechnicalRecoverySnapshot();
  const failedToFixedPatchPath = artifact(
    'TECHNICAL_RECOVERY_FAILED_TO_FIXED_RUNNER.patch',
  );
  const result = {
    unit: UNIT,
    generatedUtc: C.now(),
    reconstructionAttemptId: validation.lineage.reconstructionAttemptId,
    technicalAttemptId: validation.lineage.technicalAttemptId,
    linkedRetryAttemptId: technicalRecovery.linkedRetryAttemptId,
    reconstructionAttemptInventorySha256: reconstructionInventory.combinedSha256,
    expectedReconstructionAttemptInventorySha256:
      validation.integrity.reconstructionAttemptInventorySha256,
    technicalAttemptInventorySha256: technicalInventory.combinedSha256,
    expectedTechnicalAttemptInventorySha256:
      validation.integrity.technicalAttemptInventorySha256,
    forensicAdjudicationSha256: C.sha(fs.readFileSync(TECHNICAL_RECOVERY_ADJUDICATION)),
    expectedForensicAdjudicationSha256: validation.forensicAdjudicationSha256,
    recoveryPreflightPass: recoveryPreflight.pass,
    identityRevalidationPass: identityRevalidation.pass,
    identityRevalidationAttemptId: identityRevalidation.technicalAttemptId,
    failedToFixedRunnerPatch: {
      path: C.rel(failedToFixedPatchPath),
      sha256: C.sha(fs.readFileSync(failedToFixedPatchPath)),
      expectedSha256: technicalRecovery.failedToFixedRunnerPatch.sha256,
    },
    prerequisiteArtifactSha256,
    expectedPrerequisiteArtifactSha256: validation.integrity.prerequisiteArtifactSha256,
    externalTechnicalFreeze,
    linkedRetry: {
      count: linkedRetries.length,
      attemptId: linkedRetryRecord.attemptId,
      status: linkedRetryRecord.status,
      disposition: linkedRetryRecord.disposition,
      retryOf: linkedRetryRecord.retryOf,
      retryReason: linkedRetryRecord.retryReason,
      retryType: linkedRetryRecord.retryType,
      cycle: linkedRetryRecord.cycle,
      ordinal: linkedRetryRecord.attemptOrdinal,
      runtimeTreeDigest: linkedRetryRecord.runtimeTreeDigest,
      predecessorRuntimeTreeDigest: technicalRecord.runtimeTreeDigest,
      candidatePatchSha256: linkedRetryResult.replay?.canonicalPatch?.sha256,
      predecessorCandidatePatchSha256: technicalReplay.canonicalPatch.sha256,
      semanticBase: linkedRetryRecord.semanticBase,
    },
  };
  result.pass = reconstructionInventory.combinedSha256
      === validation.integrity.reconstructionAttemptInventorySha256
    && technicalInventory.combinedSha256
      === validation.integrity.technicalAttemptInventorySha256
    && result.forensicAdjudicationSha256 === validation.forensicAdjudicationSha256
    && recoveryPreflight.pass === true
    && identityRevalidation.pass === true
    && identityRevalidation.technicalAttemptId === validation.lineage.technicalAttemptId
    && result.failedToFixedRunnerPatch.sha256
      === result.failedToFixedRunnerPatch.expectedSha256
    && JSON.stringify(prerequisiteArtifactSha256)
      === JSON.stringify(validation.integrity.prerequisiteArtifactSha256)
    && externalTechnicalFreeze.pass
    && linkedRetries.length === 1
    && linkedRetryRecord.attemptId === technicalRecovery.linkedRetryAttemptId
    && linkedRetryRecord.status === 'completed'
    && linkedRetryRecord.retryOf === validation.lineage.technicalAttemptId
    && linkedRetryRecord.retryReason === technicalRecovery.retryReason
    && linkedRetryRecord.retryReason === 'C34_FULL_HEAD_PATCH_INVALID'
    && linkedRetryRecord.retryType === technicalRecovery.retryType
    && linkedRetryRecord.retryType === 'TECHNICAL_LINKED_RETRY'
    && linkedRetryRecord.cycle === 'nt01-retry01'
    && linkedRetryRecord.attemptOrdinal === 2
    && linkedRetryRecord.runtimeTreeDigest === technicalRecord.runtimeTreeDigest
    && linkedRetryResult.candidateIdentity?.servicesTreeDigest
      === technicalRecord.runtimeTreeDigest
    && linkedRetryResult.replay?.canonicalPatch?.sha256
      === technicalReplay.canonicalPatch.sha256
    && linkedRetryResult.fullHeadDiff?.replay?.pass === true
    && linkedRetryRecord.semanticBase?.attemptId
      === validation.lineage.reconstructionAttemptId
    && linkedRetryRecord.semanticBase?.servicesTreeDigest
      === C.C33_IDENTITY.servicesTreeDigest
    && linkedRetryRecord.semanticBase?.reasonPassed === 3504;
  C.requirePass(
    result.pass,
    `C34_TECHNICAL_RECOVERY_IMMUTABLE_ANCHOR_DRIFT_${JSON.stringify(result)}`,
  );
  return result;
}

async function finalizePreReview({
  pre,
  firstRead,
  devBefore,
  residueBefore,
  c33Manifest,
  suiteFreeze,
  initialBase,
  active,
  candidateResults,
  composition,
  preservation,
  technicalAttemptIds = [],
  technicalRecovery = null,
}) {
  const aggregate = aggregateEvidence(
    initialBase,
    active,
    candidateResults,
    composition,
    preservation,
  );
  const technicalRecoveryAnchorVerification = technicalRecovery
    ? verifyTechnicalRecoveryImmutableAnchors(technicalRecovery)
    : null;
  const linkedRetryResults = technicalRecovery
    ? candidateResults.filter((result) =>
      result.retryOf === technicalRecovery.technicalAttemptId)
    : [];
  const technicalRecoveryPass = !technicalRecovery
    || (
      pre.technicalRecovery?.pass === true
      && technicalRecoveryAnchorVerification?.pass === true
      && technicalAttemptIds.length === 1
      && technicalAttemptIds[0] === technicalRecovery.technicalAttemptId
      && linkedRetryResults.length === 1
      && linkedRetryResults[0].attemptId === technicalRecovery.linkedRetryAttemptId
      && linkedRetryResults[0].retryReason === technicalRecovery.retryReason
      && linkedRetryResults[0].retryReason === 'C34_FULL_HEAD_PATCH_INVALID'
      && linkedRetryResults[0].retryType === 'TECHNICAL_LINKED_RETRY'
      && linkedRetryResults[0].attemptOrdinal === 2
      && linkedRetryResults[0].allocationCycle === 'nt01-retry01'
      && (
        linkedRetryResults[0].disposition === 'ACCEPTED_PROMOTED_CONTROLLING'
        || linkedRetryResults[0].disposition.startsWith('REJECTED_')
      )
      && linkedRetryResults[0].candidateIdentity.servicesTreeDigest
        === technicalRecoveryAnchorVerification.linkedRetry.predecessorRuntimeTreeDigest
    );
  C.requirePass(technicalRecoveryPass, 'C34_TECHNICAL_RECOVERY_PRE_REVIEW_INVALID');
  C.requirePass(
    git('rev-parse', 'HEAD').trim() === C.START_HEAD,
    'C34_HEAD_DRIFT_BEFORE_PRE_REVIEW_CLOSURE',
  );
  const liveServiceDiffBeforeClosure = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ...L.SERVICES.map((name) => `services/${name}`),
  ).trim();
  C.requirePass(
    liveServiceDiffBeforeClosure === '',
    'C34_UNOWNED_LIVE_SERVICE_DIFF_REFUSE_RESTORE',
  );
  const allAttempts = [
    initialBase.attempt.attemptId,
    ...technicalAttemptIds,
    ...candidateResults.map((result) => result.attemptId),
    composition.attemptId,
  ];
  const registry = C.finalizeRegistryState({
    cumulativeThrough: 'commit5r1c34-incomplete',
    selectedSemanticRuntime: {
      attemptId: active.attemptId,
      candidateId: active.candidateId,
      identity: active.identity,
      metrics: active.gates.metrics,
      semanticBase: C.C33_IDENTITY.servicesTreeDigest,
    },
    reasonLayerClosure: active.gates.metrics.reasonPassed === 3720,
    runtimeClosure: false,
    expectedStartingAttemptCount: 218,
    expectedC34AttemptIds: allAttempts,
  });
  C.requirePass(
    C.sha(Buffer.from(JSON.stringify(registry.attempts.slice(0, 218))))
      === pre.registry.attemptsSha256,
    'C34_PRIOR_218_REGISTRY_RECORDS_CHANGED',
  );
  const finalAttemptLedger = C.reconcileC34AttemptLedger();
  const finalAttemptLedgerPath = artifact('ATTEMPT_LEDGER_RECONCILIATION.json');
  writeOnceJson(finalAttemptLedgerPath, finalAttemptLedger);
  C.requirePass(finalAttemptLedger.pass, 'C34_FINAL_ATTEMPT_LEDGER_NOT_RECONCILED');
  const finalWalRows = fs.readFileSync(artifact('ATTEMPT_ALLOCATION_WAL.ndjson'), 'utf8')
    .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const statusCounts = Object.fromEntries(
    [...new Set(registry.attempts.map((attempt) => attempt.status))]
      .sort()
      .map((status) => [
        status,
        registry.attempts.filter((attempt) => attempt.status === status).length,
      ]),
  );
  const walEventCounts = Object.fromEntries(
    [...new Set(finalWalRows.map((row) => row.event))]
      .sort()
      .map((event) => [
        event,
        finalWalRows.filter((row) => row.event === event).length,
      ]),
  );
  const finalRegistryWalReconciliation = {
    unit: UNIT,
    generatedUtc: C.now(),
    expected: {
      totalAttempts: 227,
      byCategory: {
        domain_campaign: 162,
        focused_suite: 13,
        other: 9,
        synthetic_validator: 43,
      },
      controlling: 224,
      nonControlling: 3,
      statusCounts: { completed: 226, technical_failure: 1 },
      c34Attempts: 9,
      technicalAdjudications: 1,
      walRows: 28,
      walEventCounts: {
        ALLOCATION_PLANNED: 9,
        ALLOCATION_REGISTERED: 9,
        ATTEMPT_TECHNICAL_ADJUDICATED: 1,
        ATTEMPT_TERMINAL: 9,
      },
    },
    actual: {
      totalAttempts: registry.attempts.length,
      byCategory: registry.summary.byCategory,
      controlling: registry.summary.controlling,
      nonControlling: registry.summary.nonControlling,
      statusCounts,
      c34Attempts: registry.attempts.filter((attempt) =>
        attempt.attemptId.includes('commit5r1c34-')).length,
      technicalAdjudications: (registry.technicalAdjudications || []).length,
      walRows: finalWalRows.length,
      walEventCounts,
      orphan: registry.summary.orphan,
      dangling: registry.summary.dangling,
      running: registry.summary.c34RunningAttemptIds,
    },
    ledgerArtifact: C.rel(finalAttemptLedgerPath),
    pass: false,
  };
  finalRegistryWalReconciliation.pass =
    finalRegistryWalReconciliation.actual.totalAttempts
      === finalRegistryWalReconciliation.expected.totalAttempts
    && JSON.stringify(finalRegistryWalReconciliation.actual.byCategory)
      === JSON.stringify(finalRegistryWalReconciliation.expected.byCategory)
    && finalRegistryWalReconciliation.actual.controlling
      === finalRegistryWalReconciliation.expected.controlling
    && finalRegistryWalReconciliation.actual.nonControlling
      === finalRegistryWalReconciliation.expected.nonControlling
    && JSON.stringify(finalRegistryWalReconciliation.actual.statusCounts)
      === JSON.stringify(finalRegistryWalReconciliation.expected.statusCounts)
    && finalRegistryWalReconciliation.actual.c34Attempts
      === finalRegistryWalReconciliation.expected.c34Attempts
    && finalRegistryWalReconciliation.actual.technicalAdjudications
      === finalRegistryWalReconciliation.expected.technicalAdjudications
    && finalRegistryWalReconciliation.actual.walRows
      === finalRegistryWalReconciliation.expected.walRows
    && JSON.stringify(finalRegistryWalReconciliation.actual.walEventCounts)
      === JSON.stringify(finalRegistryWalReconciliation.expected.walEventCounts)
    && finalRegistryWalReconciliation.actual.orphan === 0
    && finalRegistryWalReconciliation.actual.dangling === 0
    && finalRegistryWalReconciliation.actual.running.length === 0
    && finalAttemptLedger.pass;
  const finalRegistryWalPath = artifact('FINAL_REGISTRY_WAL_RECONCILIATION.json');
  writeOnceJson(finalRegistryWalPath, finalRegistryWalReconciliation);
  C.requirePass(
    finalRegistryWalReconciliation.pass,
    `C34_FINAL_REGISTRY_WAL_RECONCILIATION_FAILED_${JSON.stringify(finalRegistryWalReconciliation)}`,
  );
  const restoredIdentity = C.liveRuntimeIdentity();
  const restoreAudit = [{
    action: 'NO_WRITE_REQUIRED',
    reason:
      'All C34 semantic execution used isolated snapshots; live services remained at exact starting HEAD and were verified without overwrite.',
    identity: restoredIdentity,
  }];
  const servicesTrackedDiff = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ...L.SERVICES.map((name) => `services/${name}`),
  ).trim();
  C.requirePass(servicesTrackedDiff === '', 'C34_SERVICE_RESTORATION_TRACKED_DIFF');
  const serviceRestoration = {
    unit: UNIT,
    generatedUtc: C.now(),
    executionMode: 'all semantic gates ran against isolated immutable attempt snapshots',
    liveServicesWereSemanticBase: false,
    restorePerformed: false,
    overwriteAttempted: false,
    restoreAudit,
    restoredIdentity,
    servicesTrackedDiff,
    servicesTrackedDiffEmpty: true,
    startingHead: C.START_HEAD,
    pass: true,
  };
  const serviceRestorationPath = artifact('SERVICE_RESTORATION.json');
  writeOnceJson(serviceRestorationPath, serviceRestoration);
  const devAfter = devFactoryState('pre-review-final');
  const residueAfter = protectedResidue('pre-review-final');
  const devUnchanged = devBefore.head === devAfter.head
    && devBefore.statusSha256 === devAfter.statusSha256
    && devBefore.trackedDiffSha256 === devAfter.trackedDiffSha256;
  const residueUnchanged =
    protectedResidueKey(residueBefore) === protectedResidueKey(residueAfter);
  C.requirePass(devUnchanged, 'C34_DEV_FACTORY_CHANGED');
  C.requirePass(residueUnchanged, 'C34_PROTECTED_RESIDUE_CHANGED');
  const devAfterPath = artifact('DEV_FACTORY_FINAL_STATE.json');
  const residueAfterPath = artifact('PROTECTED_RESIDUE_FINAL_STATE.json');
  writeOnceJson(devAfterPath, { ...devAfter, unchangedFromBaseline: devUnchanged, pass: true });
  writeOnceJson(
    residueAfterPath,
    { ...residueAfter, unchangedFromBaseline: residueUnchanged, pass: true },
  );
  const knowledge = prepareKnowledgeFiles({
    active,
    initialBase,
    candidateResults,
    composition,
    registry,
    aggregate,
    serviceRestoration,
    technicalRecovery,
  });
  const accepted = candidateResults.filter((result) => result.accepted);
  const preReviewReport = {
    unit: UNIT,
    generatedUtc: C.now(),
    status: accepted.length
      ? 'INCOMPLETE_REASON_LAYER_OPEN_WITH_ACCEPTED_C34_RUNTIME'
      : 'INCOMPLETE_NO_C34_RUNTIME_PROMOTED',
    recovery: {
      forensicSnapshot: RECOVERY_SNAPSHOT,
      initialCrashCommitStateCase: 'A',
      initialCrashProcessClassification: 'NO_ACTIVE_C34_PROCESS',
      initialWorkingStateClassification: 'CLEAN_NOT_STARTED',
      currentRecoveryClassification: technicalRecovery
        ? 'TECHNICAL_INCOMPLETE_EXECUTOR_STOP'
        : 'INITIAL_EXECUTION',
      reusedCompletedAttempts: technicalRecovery
        ? [initialBase.attempt.attemptId]
        : [],
      resumedAttempts: [],
      technicalIncompleteCandidateAttempts: technicalRecovery
        ? [technicalRecovery.technicalAttemptId]
        : [],
      linkedRetryAttempts: technicalRecovery
        ? [technicalRecovery.linkedRetryAttemptId]
        : [],
      retryAttempts: technicalRecovery
        ? [{
          attemptId: technicalRecovery.linkedRetryAttemptId,
          retryOf: technicalRecovery.technicalAttemptId,
          retryReason: technicalRecovery.retryReason,
          retryType: technicalRecovery.retryType,
          attemptOrdinal: 2,
        }]
        : [],
      resumedStage: technicalRecovery
        ? 'new linked NT01 retry from the immutable completed reconstruction; the terminal predecessor was not resumed'
        : 'R5 exact M01R reconstruction',
      technicalFailurePoint: technicalRecovery?.failurePoint || null,
      candidateOnlyReplayPreservedPass: technicalRecovery
        ? technicalRecoveryAnchorVerification.linkedRetry.candidatePatchSha256
          === technicalRecoveryAnchorVerification.linkedRetry.predecessorCandidatePatchSha256
        : null,
      immutableAnchorVerification: technicalRecoveryAnchorVerification,
      technicalRecovery,
    },
    preflight: {
      artifact: C.rel(artifact('PREFLIGHT.json')),
      pass: pre.pass,
      technicalRecovery: pre.technicalRecovery || null,
    },
    mandatoryFirstRead: {
      artifact: C.rel(artifact('MANDATORY_FIRST_READ.json')),
      files: firstRead.fileCount,
      bytes: firstRead.totalBytes,
      pass: firstRead.pass,
    },
    c33ManifestValidation: c33Manifest,
    suiteIdentityFreeze: suiteFreeze,
    reconstruction: {
      attemptId: initialBase.attempt.attemptId,
      identity: initialBase.identity,
      metrics: initialBase.gates.metrics,
      pass: exactBaseMetrics(initialBase.gates),
    },
    residualInventory: {
      count: 216,
      artifact: C.rel(artifact('POST_M01R_RESIDUAL_INVENTORY.json')),
    },
    attempts: candidateResults.map((result) => ({
      attemptId: result.attemptId,
      candidateId: result.candidateId,
      disposition: result.disposition,
      accepted: result.accepted,
      metrics: result.metrics,
      newlyCorrected: result.rowLevel.newlyCorrected.length,
      newlyRegressed: result.rowLevel.newlyRegressed.length,
      failedChecks: result.failedChecks,
    })),
    composition: {
      attemptId: composition.attemptId,
      disposition: composition.disposition,
      orderDrift: composition.orderDrift.length,
      shadowing: composition.shadowing.length,
      pass: composition.pass,
    },
    selected: {
      attemptId: active.attemptId,
      candidateId: active.candidateId,
      identity: active.identity,
      metrics: active.gates.metrics,
    },
    registry: {
      totalAttempts: registry.summary.totalAttempts,
      cumulativeThrough: registry.cumulativeThrough,
      orphan: registry.summary.orphan,
      dangling: registry.summary.dangling,
      prior218Preserved: true,
    },
    attemptLedger: {
      artifact: C.rel(finalAttemptLedgerPath),
      pass: finalAttemptLedger.pass,
    },
    finalRegistryWalReconciliation: {
      artifact: C.rel(finalRegistryWalPath),
      pass: finalRegistryWalReconciliation.pass,
      actual: finalRegistryWalReconciliation.actual,
    },
    serviceRestoration,
    devFactoryUnchanged: devUnchanged,
    protectedResidueUnchanged: residueUnchanged,
    modelContinuity: knowledge.continuity.modelContinuity,
    roadmapContinuity: knowledge.continuity,
    nextTask: knowledge.nextTask,
    independentReview: {
      requiredReviewer: 'Claude Code Opus 4.8',
      exactModel: 'claude-opus-4-8',
      mode: 'read-only',
      status: 'PENDING',
    },
    finalManifest: {
      status: 'PENDING_REVIEW_AND_EXACT_KNOWLEDGE_INSTALLATION',
      path: 'evaluation/results/phase-10a14-r20/COMMIT_5R1C34_EVIDENCE_MANIFEST.sha256',
    },
    reasonLayerClosure: active.gates.metrics.reasonPassed === 3720,
    runtimeClosure: false,
    phase10A: 'OPEN',
    r20: 'IN_PROGRESS',
    passBeforeIndependentReview: initialBase.gates.frozenLocksHeld
      && accepted.every((result) => Object.values(result.promotionChecks).every(Boolean))
      && composition.pass
      && registry.summary.orphan === 0
      && registry.summary.dangling === 0
      && finalAttemptLedger.pass
      && finalRegistryWalReconciliation.pass
      && serviceRestoration.pass
      && devUnchanged
      && residueUnchanged
      && technicalRecoveryPass,
  };
  C.requirePass(preReviewReport.passBeforeIndependentReview, 'C34_PRE_REVIEW_REPORT_NOT_PASSING');
  const preReviewReportPath = artifact('PRE_REVIEW_EXECUTION_REPORT.json');
  writeOnceJson(preReviewReportPath, preReviewReport);
  checkpoint({
    stage: 'final report and registry pre-review closure',
    status: 'COMPLETED_REVIEW_READY',
    activeBaseHash: active.identity.servicesTreeDigest,
    attemptId: active.attemptId,
    artifacts: [
      preReviewReportPath,
      REGISTRY,
      finalAttemptLedgerPath,
      finalRegistryWalPath,
      serviceRestorationPath,
      knowledge.continuityPath,
      knowledge.planPath,
      ...aggregate.files,
    ],
    nextExactOperation:
      'Obtain exactly one independent Claude Code Opus 4.8 read-only review bound to the pre-review state digest.',
    safeToResume: true,
  });
  const reviewSpecification = createReviewSpecification();
  const reviewed = createReviewedStateInventory(knowledge, reviewSpecification);
  const preReviewManifest = makeEvidenceManifest(
    artifact('PRE_REVIEW_EVIDENCE_MANIFEST.sha256'),
  );
  const preReviewManifestVerification = verifyEvidenceManifest(preReviewManifest.path);
  C.requirePass(
    preReviewManifestVerification.records.some((record) =>
      record.path === C.rel(reviewed.file)),
    'C34_REVIEWED_STATE_INVENTORY_NOT_MANIFEST_BOUND',
  );
  console.log(JSON.stringify({
    unit: UNIT,
    status: 'READY_FOR_INDEPENDENT_OPUS_REVIEW',
    selectedAttempt: active.attemptId,
    selectedCandidate: active.candidateId,
    reasonPassed: active.gates.metrics.reasonPassed,
    reasonMismatches: active.gates.metrics.reasonMismatches,
    acceptedCandidates: accepted.map((result) => result.candidateId),
    reviewedStateDigest: preReviewManifest.sha256,
    reviewRequest: C.rel(reviewed.requestPath),
    preReviewManifest,
  }, null, 2));
  return {
    aggregate,
    registry,
    serviceRestoration,
    knowledge,
    preReviewReport,
    preReviewManifest,
    reviewed,
  };
}

async function execute() {
  const pre = preflight();
  const firstRead = mandatoryFirstRead();
  const devBefore = devFactoryState('preexisting');
  const residueBefore = protectedResidue('preexisting');
  const c33Manifest = validateC33Manifest();
  const suiteFreeze = suiteIdentityFreeze();
  C.requirePass(c33Manifest.pass, 'C34_C33_MANIFEST_VALIDATION_FAILED');
  C.requirePass(suiteFreeze.pass, 'C34_FROZEN_SUITE_IDENTITY_FAILED');
  writeOnceJson(artifact('PREFLIGHT.json'), pre);
  writeOnceJson(artifact('MANDATORY_FIRST_READ.json'), firstRead);
  writeOnceJson(artifact('DEV_FACTORY_PREEXISTING_STATE.json'), devBefore);
  writeOnceJson(artifact('PROTECTED_RESIDUE_BASELINE.json'), residueBefore);
  writeOnceJson(artifact('C33_MANIFEST_VALIDATION.json'), c33Manifest);
  writeOnceJson(artifact('FROZEN_SUITE_IDENTITY.json'), suiteFreeze);
  const initialBase = await reconstructSelectedBase();
  initialBase.attemptId = initialBase.attempt.attemptId;
  initialBase.candidateId =
    'C33-M01R-direct-requested-tax-consequence-excluding-computation-is-treatment';
  const preservation = await buildPreservationBaseline(initialBase);
  const residual = await residualInventory(initialBase);
  freezeHypotheses(initialBase, residual);
  let active = {
    attemptId: initialBase.attempt.attemptId,
    candidateId: initialBase.candidateId,
    dir: initialBase.dir,
    identity: initialBase.identity,
    gates: initialBase.gates,
  };
  const candidateResults = [];
  for (let index = 0; index < CANDIDATES.length; index++) {
    const result = await runMaterialCandidate(
      CANDIDATES[index],
      index + 1,
      active,
      preservation,
    );
    candidateResults.push(result);
    active = result.selected;
  }
  C.requirePass(candidateResults.length === 6, 'C34_MATERIAL_ATTEMPT_MINIMUM_NOT_MET');
  const composition = await runComposition(initialBase, active, candidateResults);
  await finalizePreReview({
    pre,
    firstRead,
    devBefore,
    residueBefore,
    c33Manifest,
    suiteFreeze,
    initialBase,
    active,
    candidateResults,
    composition,
    preservation,
  });
}

async function loadCompletedReconstructionForRecovery(reconstructionAttemptId) {
  const directory = path.join(C.ATT, reconstructionAttemptId);
  const attemptFile = path.join(directory, 'ATTEMPT.json');
  const resultFile = path.join(directory, 'ITERATION_RESULT.json');
  const snapshot = path.join(directory, 'runtime-snapshot');
  C.requirePass(fs.existsSync(attemptFile), 'C34_RECOVERY_RECONSTRUCTION_ATTEMPT_MISSING');
  C.requirePass(fs.existsSync(resultFile), 'C34_RECOVERY_RECONSTRUCTION_RESULT_MISSING');
  C.requirePass(fs.existsSync(snapshot), 'C34_RECOVERY_RECONSTRUCTION_SNAPSHOT_MISSING');
  const record = C.readJson(attemptFile);
  const result = C.readJson(resultFile);
  const identity = C.runtimeFor(snapshot);
  C.requirePass(
    record.status === 'completed'
      && record.disposition === 'RECONSTRUCTED_EXACT_C33_SELECTED_RUNTIME',
    'C34_RECOVERY_RECONSTRUCTION_NOT_TERMINAL_PASS',
  );
  C.requirePass(
    result.pass === true
      && result.attemptId === reconstructionAttemptId
      && C.sameRuntime(identity, C.C33_IDENTITY)
      && C.sameRuntime(result.identity, C.C33_IDENTITY),
    'C34_RECOVERY_RECONSTRUCTION_IDENTITY_DRIFT',
  );
  const gates = result.gates;
  C.requirePass(
    gates?.frozenLocksHeld === true
      && exactBaseMetrics(gates),
    `C34_RECOVERY_RECONSTRUCTION_GATE_DRIFT_${JSON.stringify(gates.metrics)}`,
  );
  const attempt = {
    attemptId: reconstructionAttemptId,
    dir: `${path.resolve(directory).replace(/\\/g, '/')}/`,
    record,
  };
  return {
    attempt,
    attemptId: reconstructionAttemptId,
    candidateId: 'C33-M01R-direct-requested-tax-consequence-excluding-computation-is-treatment',
    dir: snapshot,
    identity,
    gates,
    result,
  };
}

function loadPreservationForRecovery() {
  const baselinePath = artifact('M01R_PRESERVATION_BASELINE.json');
  const priorPath = artifact('PRIOR_ACCEPTED_RULE_PRESERVATION.json');
  const baseline = C.readJson(baselinePath);
  const prior = C.readJson(priorPath);
  C.requirePass(
    baseline.pass === true
      && baseline.exactM01rIdentity.servicesTreeDigest === C.C33_IDENTITY.servicesTreeDigest
      && baseline.m01rCorrections.required === 22
      && baseline.m01rCorrections.records.length === 22
      && baseline.m01rCorrections.pass
      && baseline.generalization.pass
      && baseline.leaveOneFamilyOut.pass,
    'C34_RECOVERY_M01R_PRESERVATION_BASELINE_INVALID',
  );
  C.requirePass(
    prior.pass === true
      && prior.exactActiveBase === C.C33_IDENTITY.servicesTreeDigest
      && prior.priorCorrectRows === 3504
      && prior.records.length === 3504,
    'C34_RECOVERY_PRIOR_ACCEPTED_PRESERVATION_INVALID',
  );
  return {
    ...baseline,
    priorCorrectRows: prior.records,
    files: [baselinePath, priorPath],
  };
}

function createFailedToFixedRunnerPatch() {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'tina-c34-failed-to-fixed-runner-'),
  );
  const failedDirectory = path.join(temporaryRoot, 'failed');
  const fixedDirectory = path.join(temporaryRoot, 'fixed');
  const patchPath = artifact('TECHNICAL_RECOVERY_FAILED_TO_FIXED_RUNNER.patch');
  try {
    fs.mkdirSync(failedDirectory);
    fs.mkdirSync(fixedDirectory);
    for (const [name, failedSource, fixedSource] of [
      [
        'commit5r1c34-execute.mjs',
        path.join(TECHNICAL_RECOVERY_SNAPSHOT, 'FAILED_RUN_EXECUTE.mjs'),
        C.RUNNER,
      ],
      [
        'commit5r1c34-lib.mjs',
        path.join(TECHNICAL_RECOVERY_SNAPSHOT, 'FAILED_RUN_LIB.mjs'),
        'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs',
      ],
    ]) {
      fs.copyFileSync(failedSource, path.join(failedDirectory, name));
      fs.copyFileSync(fixedSource, path.join(fixedDirectory, name));
    }
    const diff = spawnSync(
      'git',
      [
        'diff',
        '--no-index',
        '--binary',
        '--no-ext-diff',
        '--src-prefix=a/',
        '--dst-prefix=b/',
        '--',
        'failed',
        'fixed',
      ],
      {
        cwd: temporaryRoot,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 1024,
      },
    );
    C.requirePass(
      diff.status === 1 && !diff.error && diff.stdout,
      `C34_FAILED_TO_FIXED_DIFF_FAILED_${diff.status}_${diff.error || diff.stderr}`,
    );
    const text = diff.stdout.replace(/\r\n/g, '\n');
    C.requirePass(
      text.includes('a/failed/commit5r1c34-execute.mjs')
        && text.includes('b/fixed/commit5r1c34-execute.mjs')
        && text.includes('a/failed/commit5r1c34-lib.mjs')
        && text.includes('b/fixed/commit5r1c34-lib.mjs'),
      'C34_FAILED_TO_FIXED_DIFF_HEADERS_INVALID',
    );
    writeOnceText(patchPath, text);
    return {
      path: C.rel(patchPath),
      bytes: Buffer.byteLength(text),
      sha256: C.sha(Buffer.from(text)),
      failedRunnerHashes: {
        execute: FAILED_RUN_EXECUTE_SHA256,
        lib: FAILED_RUN_LIB_SHA256,
      },
      fixedRunnerHashes: {
        execute: C.sha(fs.readFileSync(C.RUNNER)),
        lib: C.sha(fs.readFileSync(
          'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs',
        )),
      },
      provenance:
        'The failed bytes were reconstructed by reversing known post-failure edits and accepted only because they exactly match immutable preallocation hashes.',
      pass: true,
    };
  } finally {
    removeOwnedTemp(temporaryRoot, 'tina-c34-failed-to-fixed-runner-');
  }
}

function revalidateNt01IdentityForRecovery(initialBase, recovery) {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'tina-c34-linked-retry-identity-'),
  );
  const materialized = path.join(temporaryRoot, 'runtime');
  const startingHead = path.join(temporaryRoot, 'starting-head');
  const technicalAttemptId = recovery.validation.lineage.technicalAttemptId;
  const technicalDirectory = path.join(C.ATT, technicalAttemptId);
  const technicalRecord = C.readJson(path.join(technicalDirectory, 'ATTEMPT.json'));
  const technicalReplay = C.readJson(
    path.join(technicalDirectory, 'C34_CANDIDATE_DELTA_REPLAY.json'),
  );
  const registryBeforeSha256 = C.sha(fs.readFileSync(REGISTRY));
  const attemptDirectoriesBefore = fs.readdirSync(C.ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  let result;
  let materializationError = null;
  try {
    const identity = C.materializeCandidate(
      initialBase.dir,
      materialized,
      [CANDIDATES[0].block],
    );
    fs.mkdirSync(startingHead);
    for (const name of L.SERVICES) {
      fs.writeFileSync(
        path.join(startingHead, name),
        C.gitShowBuffer(C.START_HEAD, `services/${name}`),
      );
    }
    const candidateOnlyPatch = C.canonicalPatch(initialBase.dir, materialized);
    const fullHeadPatchResult = C.canonicalPatch(startingHead, materialized);
    const candidateOnlyReplay = C.dualEnvironmentReplay(
      initialBase.dir,
      materialized,
      candidateOnlyPatch,
      'candidate_only_linked_retry_revalidation',
      { identityPolicy: 'exact_raw_all', throwOnFailure: false },
    );
    const fullHeadReplay = C.dualEnvironmentReplay(
      startingHead,
      materialized,
      fullHeadPatchResult,
      'full_head_linked_retry_revalidation',
      {
        identityPolicy: 'normalized_all_changed_raw_exact',
        throwOnFailure: false,
      },
    );
    result = {
      unit: UNIT,
      generatedUtc: C.now(),
      purpose:
        'Pre-allocation identity proof only; no direct semantic gate or attempt allocation executed.',
      technicalAttemptId,
      currentCandidateId: CANDIDATES[0].id,
      semanticBase: initialBase.identity,
      predecessor: {
        runtimeTreeDigest: technicalRecord.runtimeTreeDigest,
        runtimeRawBlobs: technicalRecord.runtimeRawBlobs,
        runtimeBytes: technicalRecord.runtimeBytes,
        candidatePatchSha256: technicalReplay.canonicalPatch.sha256,
        candidateReplayPass: technicalReplay.pass,
        candidateReplayTemporaryRootRemoved: technicalReplay.temporaryRootRemoved,
      },
      rematerializedIdentity: identity,
      candidateOnlyPatch: {
        sha256: candidateOnlyPatch.sha256,
        bytes: candidateOnlyPatch.bytes,
        changedFiles: candidateOnlyPatch.changedFiles,
        headersValid: candidateOnlyPatch.headersValid,
        hasForbiddenPath: candidateOnlyPatch.hasForbiddenPath,
        pass: candidateOnlyPatch.pass,
        replay: candidateOnlyReplay,
      },
      fullHeadPatch: {
        sha256: fullHeadPatchResult.sha256,
        bytes: fullHeadPatchResult.bytes,
        changedFiles: fullHeadPatchResult.changedFiles,
        headersValid: fullHeadPatchResult.headersValid,
        hasForbiddenPath: fullHeadPatchResult.hasForbiddenPath,
        pass: fullHeadPatchResult.pass,
        replay: fullHeadReplay,
      },
      registryBeforeSha256,
      attemptDirectoriesBefore,
      semanticGatesExecuted: false,
      attemptAllocated: false,
    };
    result.pass = identity.servicesTreeDigest === technicalRecord.runtimeTreeDigest
      && L.SERVICES.every((name) =>
        identity[`services/${name}`]?.rawSha256
          === technicalRecord.runtimeRawBlobs?.[`services/${name}`]
        && identity[`services/${name}`]?.bytes
          === technicalRecord.runtimeBytes?.[`services/${name}`])
      && candidateOnlyPatch.pass
      && candidateOnlyPatch.sha256
        === recovery.validation.integrity.technicalCandidatePatchSha256
      && candidateOnlyPatch.sha256 === technicalReplay.canonicalPatch.sha256
      && candidateOnlyReplay.pass
      && candidateOnlyReplay.environments.every((environment) =>
        environment.forwardRawHashMatchAll)
      && fullHeadPatchResult.pass
      && fullHeadPatchResult.sha256
        === recovery.validation.fullHeadPatchRegression.fullHeadPatchSha256
      && fullHeadReplay.pass
      && fullHeadReplay.skippedPatchCount === 0
      && fullHeadReplay.noOpCount === 0
      && fullHeadReplay.unexpectedFileCount === 0
      && technicalReplay.pass === true
      && technicalReplay.temporaryRootRemoved === true;
  } catch (error) {
    materializationError = error;
  } finally {
    removeOwnedTemp(temporaryRoot, 'tina-c34-linked-retry-identity-');
  }
  if (materializationError) throw materializationError;
  const attemptDirectoriesAfter = fs.readdirSync(C.ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .map((entry) => entry.name)
    .sort();
  result.registryAfterSha256 = C.sha(fs.readFileSync(REGISTRY));
  result.attemptDirectoriesAfter = attemptDirectoriesAfter;
  result.temporaryRootRemoved = !fs.existsSync(temporaryRoot);
  result.noAllocationOrRegistryMutation = result.registryBeforeSha256
      === result.registryAfterSha256
    && JSON.stringify(result.attemptDirectoriesBefore)
      === JSON.stringify(result.attemptDirectoriesAfter);
  result.pass = result.pass
    && result.temporaryRootRemoved
    && result.noAllocationOrRegistryMutation;
  C.requirePass(result.pass, `C34_LINKED_RETRY_IDENTITY_REVALIDATION_FAILED_${JSON.stringify(result)}`);
  return result;
}

async function resumeLinkedRetry({ stopAfterLinkedRetry = false } = {}) {
  const recovery = stopAfterLinkedRetry
    ? technicalRecoveryPreflight({
      expectedCheckpointOrdinal: 29,
      expectedCheckpointStage: 'linked retry governed no-allocation preflight',
      expectedCheckpointStatus: 'PASS_READY_FOR_LINKED_RETRY_ALLOCATION',
      requireGovernedNoAllocationPermit: true,
    })
    : technicalRecoveryPreflight();
  const recoveryPreflightPath = artifact('TECHNICAL_RECOVERY_PREFLIGHT.json');
  writeOnceJson(recoveryPreflightPath, recovery.result);
  const reconstructionAttemptId = recovery.validation.lineage.reconstructionAttemptId;
  const technicalAttemptId = recovery.validation.lineage.technicalAttemptId;
  const pre = {
    ...recovery.originalPreflight,
    technicalRecovery: {
      artifact: C.rel(recoveryPreflightPath),
      forensicAdjudication: C.rel(TECHNICAL_RECOVERY_ADJUDICATION),
      preallocationValidation: C.rel(TECHNICAL_RECOVERY_PREALLOCATION),
      pass: recovery.result.pass,
    },
  };
  const firstRead = C.readJson(artifact('MANDATORY_FIRST_READ.json'));
  const devBefore = C.readJson(artifact('DEV_FACTORY_PREEXISTING_STATE.json'));
  const residueBefore = recovery.validation.protectedResidueContinuity.recoveryBaseline;
  const c33Manifest = validateC33Manifest();
  const suiteFreeze = suiteIdentityFreeze();
  C.requirePass(firstRead.pass === true, 'C34_RECOVERY_MANDATORY_FIRST_READ_INVALID');
  C.requirePass(c33Manifest.pass, 'C34_RECOVERY_C33_MANIFEST_VALIDATION_FAILED');
  C.requirePass(suiteFreeze.pass, 'C34_RECOVERY_FROZEN_SUITE_IDENTITY_FAILED');
  const residual = C.readJson(artifact('POST_M01R_RESIDUAL_INVENTORY.json'));
  const hypotheses = C.readJson(artifact('CANDIDATE_HYPOTHESES.json'));
  C.requirePass(
    residual.pass === true
      && residual.residualCount === 216,
    'C34_RECOVERY_RESIDUAL_INVENTORY_INVALID',
  );
  C.requirePass(
    hypotheses.pass === true
      && hypotheses.total === 18
      && hypotheses.materialCandidateBudget === 6,
    'C34_RECOVERY_HYPOTHESES_INVALID',
  );
  const initialBase = await loadCompletedReconstructionForRecovery(reconstructionAttemptId);
  const preservation = loadPreservationForRecovery();
  const failedToFixedRunnerPatch = createFailedToFixedRunnerPatch();
  const nt01IdentityRevalidation = revalidateNt01IdentityForRecovery(initialBase, recovery);
  const nt01IdentityRevalidationPath = artifact(
    'TECHNICAL_RECOVERY_NT01_IDENTITY_REVALIDATION.json',
  );
  writeOnceJson(nt01IdentityRevalidationPath, nt01IdentityRevalidation);
  let active = {
    attemptId: initialBase.attempt.attemptId,
    candidateId: initialBase.candidateId,
    dir: initialBase.dir,
    identity: initialBase.identity,
    gates: initialBase.gates,
  };
  const retryReason = 'C34_FULL_HEAD_PATCH_INVALID';
  const retryType = 'TECHNICAL_LINKED_RETRY';
  const candidateResults = [];
  if (stopAfterLinkedRetry) {
    const lateProcessState = processAndPortState();
    const lateZeroAllocation = zeroRetryAllocationState();
    const remainingMs = Date.parse(TIMEBOX_HARD_STOP_UTC) - Date.now();
    const timeEligible = Date.now() <= Date.parse(TIMEBOX_RETRY_LATEST_START_UTC)
      && remainingMs >= 20 * 60 * 1000;
    const lateGate = {
      schemaVersion: 1,
      unit: UNIT,
      generatedUtc: C.now(),
      decision: timeEligible
        ? 'PASS_ALLOCATE_EXACTLY_ONE_LINKED_RETRY'
        : 'SKIP_ALLOCATION_TIMEBOX_MARGIN_NOT_MET',
      timebox: {
        startedUtc: TIMEBOX_STARTED_UTC,
        hardStopUtc: TIMEBOX_HARD_STOP_UTC,
        retryLatestStartUtc: TIMEBOX_RETRY_LATEST_START_UTC,
        remainingMs,
        requiredRemainingMs: 20 * 60 * 1000,
      },
      processState: lateProcessState,
      zeroAllocation: lateZeroAllocation,
      governedPermit: hashRecord(TIMEBOX_NO_ALLOCATION_PREFLIGHT),
      retryContract: {
        candidate: 'nt01-retry01',
        semanticCandidateId: CANDIDATES[0].id,
        ordinal: 2,
        retryOf: technicalAttemptId,
        retryReason,
        retryType,
        activeBaseHash: active.identity.servicesTreeDigest,
      },
      pass: timeEligible
        && lateProcessState.processInspectionSucceeded
        && lateProcessState.allNodeCommandLinesReadable
        && lateProcessState.activeC34RunnerCount === 0
        && lateProcessState.netstatInspectionStatus === 0
        && lateProcessState.port5173Free
        && lateZeroAllocation.pass
        && active.identity.servicesTreeDigest === C.C33_IDENTITY.servicesTreeDigest,
    };
    if (fs.existsSync(TIMEBOX_LATE_ALLOCATION_GATE)) {
      const existingGate = C.readJson(TIMEBOX_LATE_ALLOCATION_GATE);
      C.requirePass(
        existingGate.pass === true
          && existingGate.decision === 'PASS_ALLOCATE_EXACTLY_ONE_LINKED_RETRY',
        'C34_EXISTING_LATE_ALLOCATION_GATE_NOT_PASSING',
      );
    } else {
      writeOnceJson(TIMEBOX_LATE_ALLOCATION_GATE, lateGate);
    }
    if (!lateGate.pass) {
      console.log(JSON.stringify(lateGate, null, 2));
      return { allocated: false, reason: lateGate.decision, lateGate };
    }
  }
  let retryResult;
  try {
    retryResult = await runMaterialCandidate(
      CANDIDATES[0],
      1,
      active,
      preservation,
      {
        allocationCycle: 'nt01-retry01',
        allocationOrdinal: 2,
        retryOf: technicalAttemptId,
        retryReason,
        retryType,
      },
    );
  } catch (error) {
    if (!stopAfterLinkedRetry) throw error;
    const technicalLedger = C.reconcileC34AttemptLedger({ throwOnFailure: false });
    const technicalLedgerPath = artifact('ATTEMPT_LEDGER_AFTER_LINKED_RETRY_TECHNICAL_FAILURE.json');
    writeOnceOrSameJson(technicalLedgerPath, technicalLedger);
    console.error(error?.stack || String(error));
    return {
      allocated: true,
      technicalFailure: true,
      error: error?.stack || String(error),
      ledger: technicalLedger,
      ledgerArtifact: C.rel(technicalLedgerPath),
    };
  }
  candidateResults.push(retryResult);
  active = retryResult.selected;
  const linkedRetryLedger = C.reconcileC34AttemptLedger();
  const linkedRetryLedgerPath = artifact('ATTEMPT_LEDGER_AFTER_LINKED_RETRY.json');
  writeOnceJson(linkedRetryLedgerPath, linkedRetryLedger);
  C.requirePass(
    linkedRetryLedger.pass
      && linkedRetryLedger.orphan === 0
      && linkedRetryLedger.dangling === 0
      && linkedRetryLedger.running.length === 0
      && linkedRetryLedger.records.some((record) =>
        record.attemptId === retryResult.attemptId && record.pass),
    'C34_LINKED_RETRY_LEDGER_NOT_RECONCILED',
  );
  appendIdempotentCheckpoint({
    ordinal: 33,
    updatedAtUtc: linkedRetryLedger.generatedUtc,
    stage: 'post-linked-retry reconciliation',
    status: 'REGISTRY_WAL_RECONCILED_CUMULATIVE_BASE_CONFIRMED',
    activeBaseHash: active.identity.servicesTreeDigest,
    attemptId: retryResult.attemptId,
    artifacts: [
      linkedRetryLedgerPath,
      path.join(retryResult.attempt.dir, 'ITERATION_RESULT.json'),
    ],
    nextExactOperation:
      'Stop for the one-hour safe pause. On a future authorized continuation, resume C34 at material candidate 2 against this exact cumulative active base; do not rerun the linked retry.',
    safeToResume: true,
  });
  if (stopAfterLinkedRetry) {
    return {
      allocated: true,
      attemptId: retryResult.attemptId,
      disposition: retryResult.disposition,
      accepted: retryResult.accepted,
      activeBaseHash: active.identity.servicesTreeDigest,
      ledgerArtifact: C.rel(linkedRetryLedgerPath),
    };
  }
  for (let index = 1; index < CANDIDATES.length; index++) {
    const result = await runMaterialCandidate(
      CANDIDATES[index],
      index + 1,
      active,
      preservation,
    );
    candidateResults.push(result);
    active = result.selected;
  }
  C.requirePass(candidateResults.length === 6, 'C34_RECOVERY_MATERIAL_ATTEMPT_SET_INVALID');
  const composition = await runComposition(initialBase, active, candidateResults);
  await finalizePreReview({
    pre,
    firstRead,
    devBefore,
    residueBefore,
    c33Manifest,
    suiteFreeze,
    initialBase,
    active,
    candidateResults,
    composition,
    preservation,
    technicalAttemptIds: [technicalAttemptId],
    technicalRecovery: {
      technicalAttemptId,
      linkedRetryAttemptId: retryResult.attemptId,
      retryReason,
      retryType,
      linkedRetryDisposition: retryResult.disposition,
      linkedRetryAccepted: retryResult.accepted,
      linkedRetryMetrics: retryResult.metrics,
      failureCode: 'C34_FULL_HEAD_PATCH_INVALID',
      semanticGatesReachedInTechnicalAttempt: false,
      failurePoint:
        'AFTER_CANDIDATE_ONLY_REPLAY_BEFORE_DIRECT_R3_FROZEN_QUERY_LEVEL_SEMANTIC_GATES',
      adjudicationArtifact: C.rel(TECHNICAL_RECOVERY_ADJUDICATION),
      validationArtifact: C.rel(TECHNICAL_RECOVERY_PREALLOCATION),
      recoveryPreflightArtifact: C.rel(recoveryPreflightPath),
      nt01IdentityRevalidationArtifact: C.rel(nt01IdentityRevalidationPath),
      failedToFixedRunnerPatch,
    },
  });
}

function verifyTimeboxedSafePauseManifest() {
  C.requirePass(
    fs.existsSync(TIMEBOX_SAFE_PAUSE_MANIFEST),
    'C34_TIMEBOX_SAFE_PAUSE_MANIFEST_MISSING',
  );
  const lines = fs.readFileSync(TIMEBOX_SAFE_PAUSE_MANIFEST, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);
  const records = lines.map((line) => {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    C.requirePass(match, `C34_TIMEBOX_SAFE_PAUSE_MANIFEST_BAD_LINE_${line}`);
    const file = path.resolve(match[2]);
    const exists = fs.existsSync(file);
    const actualSha256 = exists ? C.sha(fs.readFileSync(file)) : null;
    return {
      path: match[2],
      expectedSha256: match[1],
      actualSha256,
      exists,
      pass: exists && actualSha256 === match[1],
    };
  });
  const result = {
    manifest: hashRecord(TIMEBOX_SAFE_PAUSE_MANIFEST),
    entries: records.length,
    records,
    badRecords: records.filter((record) => !record.pass),
    pass: records.length > 0 && records.every((record) => record.pass),
  };
  C.requirePass(result.pass, `C34_TIMEBOX_SAFE_PAUSE_MANIFEST_INVALID_${JSON.stringify(result.badRecords)}`);
  return result;
}

function createTimeboxedSafePauseManifest() {
  if (fs.existsSync(TIMEBOX_SAFE_PAUSE_MANIFEST)) {
    return verifyTimeboxedSafePauseManifest();
  }
  const excluded = new Set([
    path.resolve(RECOVERY_CHECKPOINT),
    path.resolve(RECOVERY_CHECKPOINT_LOG),
    path.resolve(TIMEBOX_SAFE_PAUSE),
    path.resolve(TIMEBOX_SAFE_PAUSE_MANIFEST),
  ]);
  const topLevel = fs.readdirSync(C.RES, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('COMMIT_5R1C34_'))
    .map((entry) => path.join(C.RES, entry.name));
  const c34AttemptFiles = fs.readdirSync(C.ATT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.includes('commit5r1c34-'))
    .flatMap((entry) => C.recursiveFiles(path.join(C.ATT, entry.name)));
  const files = [...new Set([
    ...topLevel,
    ...c34AttemptFiles,
    REGISTRY,
    C.RUNNER,
    'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs',
  ].map((file) => path.resolve(file)))]
    .filter((file) => !excluded.has(file))
    .sort((first, second) => C.rel(first).localeCompare(C.rel(second)));
  const text = `${files.map((file) =>
    `${C.sha(fs.readFileSync(file))}  ${C.rel(file)}`).join('\n')}\n`;
  writeOnceText(TIMEBOX_SAFE_PAUSE_MANIFEST, text);
  return verifyTimeboxedSafePauseManifest();
}

function currentTimeboxedPauseState() {
  const registry = C.readJson(REGISTRY);
  const retries = registry.attempts.filter((attempt) =>
    attempt.retryOf === ORIGINAL_NT01_ATTEMPT);
  C.requirePass(retries.length <= 1, `C34_MORE_THAN_ONE_LINKED_RETRY_${retries.length}`);
  const retry = retries[0] || null;
  let retryResult = null;
  let activeBaseHash = C.C33_IDENTITY.servicesTreeDigest;
  let disposition = null;
  if (retry) {
    const iterationPath = path.join(C.ATT, retry.attemptId, 'ITERATION_RESULT.json');
    if (fs.existsSync(iterationPath)) {
      retryResult = C.readJson(iterationPath);
      activeBaseHash = retryResult.accepted
        ? retryResult.candidateIdentity.servicesTreeDigest
        : retryResult.activeBase.identity.servicesTreeDigest;
      disposition = retryResult.disposition;
    } else {
      C.requirePass(
        retry.status === 'technical_failure',
        `C34_RETRY_RESULT_MISSING_FOR_NONTECHNICAL_ATTEMPT_${retry.attemptId}`,
      );
      disposition = retry.disposition;
    }
  }
  const classification = retry == null
    ? fs.existsSync(TIMEBOX_NO_ALLOCATION_PREFLIGHT)
      ? 'ONE_HOUR_SAFE_PAUSE_POST_PREFLIGHT'
      : 'ONE_HOUR_SAFE_PAUSE_PREALLOCATION'
    : retry.status === 'technical_failure'
      ? 'ONE_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER'
      : 'ONE_HOUR_SAFE_PAUSE_POST_ATTEMPT';
  const nextExactOperation = retry == null
    ? 'Allocate exactly one new nt01-retry01 ordinal-2 linked retry of the original NT01 against the exact C33 M01R base; only proceed under a fresh authorized timebox with at least 20 minutes available.'
    : retry.status === 'technical_failure'
      ? 'Forensically inspect the terminal linked-retry technical failure. Do not allocate another linked retry or continue candidates 2-6 until separately authorized.'
      : 'Resume C34 at material candidate 2 against the exact recorded cumulative active base. Do not rerun or reallocate nt01-retry01.';
  return {
    retry,
    retryResult,
    activeAttemptId: retry?.attemptId || null,
    activeBaseHash,
    disposition,
    classification,
    nextExactOperation,
  };
}

function timeboxedSafePause() {
  if (fs.existsSync(TIMEBOX_SAFE_PAUSE)) {
    const pause = C.readJson(TIMEBOX_SAFE_PAUSE);
    const manifest = verifyTimeboxedSafePauseManifest();
    const ledger = C.reconcileC34AttemptLedger();
    const processState = processAndPortState();
    const pauseState = currentTimeboxedPauseState();
    C.requirePass(
      pause.pass === true
        && pause.safeToResume === true
        && pause.activeAttemptId === pauseState.activeAttemptId
        && pause.activeBaseHash === pauseState.activeBaseHash
        && pause.classification === pauseState.classification
        && pause.registry.sha256 === C.sha(fs.readFileSync(REGISTRY))
        && pause.allocationWal.sha256
          === C.sha(fs.readFileSync(artifact('ATTEMPT_ALLOCATION_WAL.ndjson')))
        && ledger.pass
        && processState.processInspectionSucceeded
        && processState.activeC34RunnerCount === 0
        && processState.port5173Free
        && manifest.pass,
      'C34_EXISTING_TIMEBOX_SAFE_PAUSE_INVALID',
    );
    const checkpointResult = appendIdempotentCheckpoint({
      ordinal: pause.checkpointPlan.ordinal,
      updatedAtUtc: pause.generatedUtc,
      stage: pause.checkpointPlan.stage,
      status: pause.classification,
      activeBaseHash: pause.activeBaseHash,
      attemptId: pause.activeAttemptId,
      artifacts: pause.checkpointPlan.artifactPaths.map((file) => path.resolve(file)),
      nextExactOperation: pause.nextExactOperation,
      safeToResume: true,
      blocker: pause.blocker,
    });
    console.log(JSON.stringify({
      classification: pause.classification,
      checkpoint: checkpointResult.event,
      idempotent: !checkpointResult.appended,
      manifest: manifest.manifest,
      pass: true,
    }, null, 2));
    return pause;
  }
  const currentCheckpoint = C.readJson(RECOVERY_CHECKPOINT);
  const checkpointChainBefore = validateCheckpointChain();
  C.requirePass(
    checkpointChainBefore.pass
      && currentCheckpoint.ordinal === checkpointChainBefore.rows,
    'C34_TIMEBOX_SAFE_PAUSE_CHECKPOINT_CHAIN_NOT_AT_CURRENT_TIP',
  );
  const ledger = C.reconcileC34AttemptLedger();
  const processState = processAndPortState();
  const pauseState = currentTimeboxedPauseState();
  const liveServices = C.liveRuntimeIdentity();
  const serviceDiff = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ...L.SERVICES.map((name) => `services/${name}`),
  ).trim();
  const staging = git('diff', '--cached', '--name-only').trim();
  const head = git('rev-parse', 'HEAD').trim();
  const upstream = git('rev-parse', '@{u}').trim();
  const sync = git('rev-list', '--left-right', '--count', 'HEAD...@{u}').trim();
  const status = git('status', '--porcelain=v1', '--untracked-files=all');
  const c35Items = status.split(/\r?\n/).filter((line) => /5R1C35|commit5r1c35/i.test(line));
  const temporaryPrefixes = [
    'tina-c34-candidate-',
    'tina-c34-linked-retry-',
    'tina-c34-debug-analyzer-',
    'tina-c34-composition-',
    'tina-c34-process-inspection-',
  ];
  const temporaryRuntimeDirectories = fs.readdirSync(os.tmpdir(), { withFileTypes: true })
    .filter((entry) =>
      entry.isDirectory() && temporaryPrefixes.some((prefix) => entry.name.startsWith(prefix)))
    .map((entry) => path.join(os.tmpdir(), entry.name).replace(/\\/g, '/'))
    .sort();
  const manifest = createTimeboxedSafePauseManifest();
  const registryRecord = hashRecord(REGISTRY);
  const walRecord = hashRecord(artifact('ATTEMPT_ALLOCATION_WAL.ndjson'));
  const checkpointOrdinal = checkpointChainBefore.rows + 1;
  const checkpointArtifacts = [
    TIMEBOX_SAFE_PAUSE,
    TIMEBOX_SAFE_PAUSE_MANIFEST,
    ...(fs.existsSync(TIMEBOX_COMPATIBILITY_VALIDATION)
      ? [TIMEBOX_COMPATIBILITY_VALIDATION]
      : []),
    ...(fs.existsSync(TIMEBOX_NO_ALLOCATION_PREFLIGHT)
      ? [TIMEBOX_NO_ALLOCATION_PREFLIGHT]
      : []),
    ...(fs.existsSync(TIMEBOX_LATE_ALLOCATION_GATE)
      ? [TIMEBOX_LATE_ALLOCATION_GATE]
      : []),
    ...(fs.existsSync(artifact('ATTEMPT_LEDGER_AFTER_LINKED_RETRY.json'))
      ? [artifact('ATTEMPT_LEDGER_AFTER_LINKED_RETRY.json')]
      : []),
    ...(pauseState.retryResult
      ? [path.join(C.ATT, pauseState.retry.attemptId, 'ITERATION_RESULT.json')]
      : []),
  ];
  const pause = {
    schemaVersion: 1,
    unit: UNIT,
    generatedUtc: C.now(),
    elapsedMs: Date.now() - Date.parse(TIMEBOX_STARTED_UTC),
    timebox: {
      startedUtc: TIMEBOX_STARTED_UTC,
      hardStopUtc: TIMEBOX_HARD_STOP_UTC,
      stoppedBeforeHardLimit: Date.now() <= Date.parse(TIMEBOX_HARD_STOP_UTC),
    },
    classification: pauseState.classification,
    stage: 'one-hour terminal safe pause',
    status: pauseState.classification,
    safeToResume: true,
    activeAttemptId: pauseState.activeAttemptId,
    activeBaseHash: pauseState.activeBaseHash,
    linkedRetry: pauseState.retry == null
      ? { allocated: false, attemptId: null, disposition: null }
      : {
        allocated: true,
        attemptId: pauseState.retry.attemptId,
        status: pauseState.retry.status,
        disposition: pauseState.disposition,
        retryOf: pauseState.retry.retryOf,
        retryReason: pauseState.retry.retryReason,
        retryType: pauseState.retry.retryType,
      },
    completedArtifactHashes: manifest.records.map((record) => ({
      path: record.path,
      sha256: record.actualSha256,
    })),
    evidenceManifest: manifest.manifest,
    checkpointBefore: currentCheckpoint,
    checkpointChainBefore,
    checkpointPlan: {
      ordinal: checkpointOrdinal,
      stage: 'one-hour terminal safe pause',
      artifactPaths: checkpointArtifacts.map((file) => C.rel(file)),
    },
    ledger,
    registry: registryRecord,
    allocationWal: walRecord,
    processState,
    temporaryRuntimeState: {
      temporaryRuntimeDirectories,
      temporaryCandidateInstalled: serviceDiff !== '',
      restorationRequired: serviceDiff !== '',
      restorationAction: serviceDiff === '' ? 'NO_WRITE_REQUIRED' : 'BLOCKED_UNOWNED_DIFF_PRESERVED',
    },
    liveServices: {
      identity: liveServices,
      expectedHeadServicesTreeDigest:
        '7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201',
      serviceDiff,
    },
    gitState: {
      head,
      expectedHead: C.START_HEAD,
      upstream,
      sync,
      staging,
      c35Items,
      commitOccurred: head !== C.START_HEAD,
      pushOccurredOrSyncChanged: upstream !== C.START_HEAD || sync !== '0\t0',
    },
    blocker: pauseState.classification === 'ONE_HOUR_SAFE_PAUSE_TECHNICAL_BLOCKER'
      ? 'C34_LINKED_RETRY_TECHNICAL_FAILURE'
      : null,
    nextExactOperation: pauseState.nextExactOperation,
    pass: false,
  };
  pause.pass = ledger.pass
    && ledger.orphan === 0
    && ledger.dangling === 0
    && ledger.running.length === 0
    && processState.processInspectionSucceeded
    && processState.allNodeCommandLinesReadable
    && processState.activeC34RunnerCount === 0
    && processState.netstatInspectionStatus === 0
    && processState.port5173Free
    && temporaryRuntimeDirectories.length === 0
    && serviceDiff === ''
    && liveServices.servicesTreeDigest
      === '7737603844a1af11c2997ba50ecd3226ecd8e635b8adbfd4ea8984f5af6d0201'
    && staging === ''
    && head === C.START_HEAD
    && upstream === C.START_HEAD
    && sync === '0\t0'
    && c35Items.length === 0
    && manifest.pass
    && (pauseState.retry == null
      || ['completed', 'technical_failure'].includes(pauseState.retry.status));
  C.requirePass(pause.pass, 'C34_TIMEBOX_SAFE_PAUSE_RECONCILIATION_FAILED');
  writeOnceJson(TIMEBOX_SAFE_PAUSE, pause);
  const checkpointResult = appendIdempotentCheckpoint({
    ordinal: checkpointOrdinal,
    updatedAtUtc: pause.generatedUtc,
    stage: 'one-hour terminal safe pause',
    status: pause.classification,
    activeBaseHash: pause.activeBaseHash,
    attemptId: pause.activeAttemptId,
    artifacts: checkpointArtifacts,
    nextExactOperation: pause.nextExactOperation,
    safeToResume: true,
    blocker: pause.blocker,
  });
  const checkpointChainAfter = validateCheckpointChain();
  C.requirePass(
    checkpointChainAfter.pass
      && checkpointChainAfter.rows === checkpointOrdinal
      && checkpointResult.event.safeToResume === true,
    'C34_TIMEBOX_FINAL_CHECKPOINT_VALIDATION_FAILED',
  );
  console.log(JSON.stringify({
    classification: pause.classification,
    checkpoint: checkpointResult.event,
    evidenceManifest: manifest.manifest,
    pass: true,
  }, null, 2));
  return pause;
}

function extractStructuredReview(envelope) {
  if (envelope?.structured_output && typeof envelope.structured_output === 'object') {
    return envelope.structured_output;
  }
  if (envelope?.result && typeof envelope.result === 'object') return envelope.result;
  if (typeof envelope?.result === 'string') {
    try {
      return JSON.parse(envelope.result);
    } catch {
      // Fall through to explicit failure below.
    }
  }
  if (envelope?.review && typeof envelope.review === 'object') return envelope.review;
  if (envelope?.decision) return envelope;
  throw new Error('C34_OPUS_STRUCTURED_REVIEW_NOT_FOUND');
}

function expectedReviewPrompt(reviewedStateDigest) {
  const request = fs.readFileSync(artifact('INDEPENDENT_REVIEW_REQUEST.md'), 'utf8');
  return `${request}

## Exact reviewed-state binding supplied by the fail-closed C34 orchestrator

The independently computed lowercase SHA-256 of the exact pre-review evidence
manifest bytes is:

\`${reviewedStateDigest}\`

Bind the decision to that exact digest. The finalizer will independently
recompute the manifest digest and verify every manifest entry before accepting
the review.
`;
}

function expectedClaudeReviewArgv(reviewedStateDigest) {
  return [
    '-p',
    expectedReviewPrompt(reviewedStateDigest),
    '--model',
    'claude-opus-4-8',
    '--effort',
    'max',
    '--permission-mode',
    'plan',
    '--tools',
    'Read,Glob,Grep,Bash',
    '--allowedTools',
    'Read,Glob,Grep,Bash(sha256sum *)',
    '--no-session-persistence',
    '--output-format',
    'json',
    '--json-schema',
    JSON.stringify(CLAUDE_REVIEW_JSON_SCHEMA),
  ];
}

function installPreparedFile(source, target, expectedOldSha256) {
  const targetAbsolute = abs(target);
  const sourceAbsolute = abs(source);
  const sourceSha256 = C.sha(fs.readFileSync(sourceAbsolute));
  const currentSha256 = C.sha(fs.readFileSync(targetAbsolute));
  if (currentSha256 === sourceSha256) {
    const existing = hashRecord(targetAbsolute);
    return { ...existing, rawSha256: existing.sha256, alreadyInstalled: true };
  }
  C.requirePass(
    currentSha256 === expectedOldSha256,
    `C34_KNOWLEDGE_COMPARE_AND_SWAP_CONFLICT_${target}`,
  );
  const temporary = `${targetAbsolute}.c34-${process.pid}-${crypto.randomBytes(5).toString('hex')}.tmp`;
  fs.copyFileSync(sourceAbsolute, temporary, fs.constants.COPYFILE_EXCL);
  fs.renameSync(temporary, targetAbsolute);
  const record = hashRecord(targetAbsolute);
  return { ...record, rawSha256: record.sha256, alreadyInstalled: false };
}

function nextReviewRejectionOrdinal() {
  const names = fs.readdirSync(C.RES)
    .filter((name) => /^COMMIT_5R1C34_OPUS_REVIEW_REJECTION_\d+\.json$/.test(name));
  return names.length + 1;
}

function invokeOpusReview() {
  const capturePath = artifact('INDEPENDENT_REVIEW_CLI_CAPTURE_PENDING.json');
  C.requirePass(!fs.existsSync(capturePath), 'C34_OPUS_REVIEW_CAPTURE_ALREADY_EXISTS');
  C.requirePass(
    !fs.existsSync(artifact('INDEPENDENT_REVIEW.json')),
    'C34_OPUS_REVIEW_ALREADY_FINALIZED',
  );
  const manifestVerification = verifyEvidenceManifest(
    artifact('PRE_REVIEW_EVIDENCE_MANIFEST.sha256'),
  );
  C.requirePass(manifestVerification.pass, 'C34_PRE_REVIEW_MANIFEST_INVALID_BEFORE_OPUS');
  const powershell = 'C:/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe';
  const resolution = spawnSync(
    powershell,
    [
      '-NoProfile',
      '-Command',
      "(Get-Command claude -CommandType ExternalScript,Application -ErrorAction Stop | Select-Object -First 1).Source",
    ],
    { cwd: C.REPO, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  const resolvedCliPath = (resolution.stdout || '').trim();
  C.requirePass(
    resolution.status === 0
      && !/[\r\n]/.test(resolvedCliPath)
      && /claude(?:\.ps1|\.cmd|\.exe)?$/i.test(resolvedCliPath),
    `C34_CLAUDE_CLI_RESOLUTION_FAILED_${resolution.status}_${resolution.stderr}`,
  );
  const versionResult = spawnSync(
    powershell,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolvedCliPath, '--version'],
    { cwd: C.REPO, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  const cliVersion = (versionResult.stdout || '').trim().split(/\s+/)[0];
  C.requirePass(
    versionResult.status === 0 && /^\d+\.\d+\.\d+/.test(cliVersion),
    `C34_CLAUDE_CLI_VERSION_FAILED_${versionResult.status}_${versionResult.stderr}`,
  );
  const argv = expectedClaudeReviewArgv(manifestVerification.sha256);
  const reviewResult = spawnSync(
    powershell,
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      resolvedCliPath,
      ...argv,
    ],
    {
      cwd: C.REPO,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 1024,
      timeout: 30 * 60 * 1000,
    },
  );
  const rawStdout = reviewResult.stdout || '';
  const capture = {
    unit: UNIT,
    capturedUtc: C.now(),
    resolvedCliPath: resolvedCliPath.replace(/\\/g, '/'),
    cliVersion,
    argv,
    cwd: C.REPO,
    exitCode: reviewResult.status,
    signal: reviewResult.signal,
    error: reviewResult.error ? String(reviewResult.error) : null,
    stderr: reviewResult.stderr || '',
    rawStdout,
    rawStdoutSha256: C.sha(Buffer.from(rawStdout)),
    reviewedStateDigest: manifestVerification.sha256,
  };
  writeOnceJson(capturePath, capture);
  console.log(JSON.stringify({
    unit: UNIT,
    capture: C.rel(capturePath),
    exitCode: capture.exitCode,
    signal: capture.signal,
    error: capture.error,
    stderr: capture.stderr,
    rawStdoutSha256: capture.rawStdoutSha256,
    reviewedStateDigest: capture.reviewedStateDigest,
    readyToFinalizeReview: capture.exitCode === 0,
  }, null, 2));
  C.requirePass(capture.exitCode === 0, 'C34_OPUS_REVIEW_INVOCATION_FAILED');
  return capturePath;
}

async function finalizeReview(inputFile) {
  C.requirePass(inputFile, 'C34_FINALIZE_REVIEW_INPUT_REQUIRED');
  const inputAbsolute = path.resolve(inputFile);
  C.requirePass(
    inputAbsolute.toLowerCase()
      === path.resolve(artifact('INDEPENDENT_REVIEW_CLI_CAPTURE_PENDING.json')).toLowerCase(),
    'C34_FINALIZE_REVIEW_INPUT_NOT_EXACT_PENDING_CAPTURE',
  );
  C.requirePass(fs.existsSync(inputAbsolute), 'C34_FINALIZE_REVIEW_INPUT_MISSING');
  C.requirePass(
    !fs.existsSync(path.join(C.REPO, '.git', 'index.lock')),
    'C34_GIT_INDEX_LOCK_PRESENT_BEFORE_REVIEW_FINALIZATION',
  );
  C.requirePass(
    git('diff', '--cached', '--name-only').trim() === '',
    'C34_STAGING_OCCURRED_BEFORE_REVIEW_FINALIZATION',
  );
  const manifestVerification = verifyEvidenceManifest(
    artifact('PRE_REVIEW_EVIDENCE_MANIFEST.sha256'),
  );
  C.requirePass(manifestVerification.pass, 'C34_PRE_REVIEW_MANIFEST_CHANGED');
  const inputBytes = fs.readFileSync(inputAbsolute);
  const priorReviewArtifacts = fs.readdirSync(C.RES).filter((name) =>
    name === 'COMMIT_5R1C34_INDEPENDENT_REVIEW.json'
    || /^COMMIT_5R1C34_OPUS_REVIEW_REJECTION_\d+\.json$/.test(name));
  C.requirePass(
    priorReviewArtifacts.length === 0,
    `C34_ONE_REVIEW_BUDGET_ALREADY_CONSUMED_${priorReviewArtifacts.join(',')}`,
  );
  const capture = JSON.parse(inputBytes.toString('utf8').replace(/^\uFEFF/, ''));
  C.requirePass(typeof capture.rawStdout === 'string', 'C34_CLAUDE_RAW_STDOUT_MISSING');
  C.requirePass(
    C.sha(Buffer.from(capture.rawStdout)) === capture.rawStdoutSha256,
    'C34_CLAUDE_RAW_STDOUT_CAPTURE_HASH_MISMATCH',
  );
  C.requirePass(capture.exitCode === 0, `C34_CLAUDE_EXIT_${capture.exitCode}`);
  C.requirePass(
    /claude(?:\.ps1|\.cmd|\.exe)?$/i.test(capture.resolvedCliPath || ''),
    'C34_CLAUDE_RESOLVED_CLI_PATH',
  );
  C.requirePass(
    /^\d+\.\d+\.\d+/.test(capture.cliVersion || ''),
    'C34_CLAUDE_CLI_VERSION_MISSING',
  );
  C.requirePass(Array.isArray(capture.argv), 'C34_CLAUDE_ARGV_MISSING');
  C.requirePass(
    capture.argv.every((value) => typeof value === 'string'),
    'C34_CLAUDE_ARGV_NON_STRING_VALUE',
  );
  const expectedArgv = expectedClaudeReviewArgv(manifestVerification.sha256);
  C.requirePass(
    JSON.stringify(capture.argv) === JSON.stringify(expectedArgv),
    'C34_CLAUDE_ARGV_NOT_EXACT_READ_ONLY_REVIEW_INVOCATION',
  );
  C.requirePass(
    typeof capture.cwd === 'string'
      && path.resolve(capture.cwd).toLowerCase() === path.resolve(C.REPO).toLowerCase(),
    'C34_CLAUDE_REVIEW_CWD_MISMATCH',
  );
  const envelope = JSON.parse(capture.rawStdout.replace(/^\uFEFF/, ''));
  C.requirePass(envelope.type === 'result', `C34_CLAUDE_ENVELOPE_TYPE_${envelope.type}`);
  C.requirePass(envelope.subtype === 'success', `C34_CLAUDE_ENVELOPE_SUBTYPE_${envelope.subtype}`);
  C.requirePass(envelope.is_error === false, 'C34_CLAUDE_ENVELOPE_IS_ERROR');
  C.requirePass(
    Array.isArray(envelope.permission_denials) && envelope.permission_denials.length === 0,
    'C34_CLAUDE_PERMISSION_DENIAL',
  );
  const modelUsageKeys = Object.keys(envelope.modelUsage || {});
  C.requirePass(
    modelUsageKeys.length === 1 && modelUsageKeys[0] === 'claude-opus-4-8',
    `C34_CLAUDE_MODEL_USAGE_${JSON.stringify(modelUsageKeys)}`,
  );
  const review = extractStructuredReview(envelope);
  const preReviewReport = C.readJson(artifact('PRE_REVIEW_EXECUTION_REPORT.json'));
  const technicalRecovery = preReviewReport.recovery?.technicalRecovery || null;
  const technicalRecoveryRequiredPaths = technicalRecovery
    ? [
      C.rel(TECHNICAL_RECOVERY_ADJUDICATION),
      C.rel(TECHNICAL_RECOVERY_PREALLOCATION),
      C.rel(artifact('TECHNICAL_RECOVERY_PREFLIGHT.json')),
      C.rel(artifact('TECHNICAL_RECOVERY_NT01_IDENTITY_REVALIDATION.json')),
      C.rel(artifact('TECHNICAL_RECOVERY_FAILED_TO_FIXED_RUNNER.patch')),
      C.rel(artifact('FULL_HEAD_PATCH_BLOCKER_ROOT_CAUSE.json')),
      C.rel(artifact('FULL_HEAD_PATCH_BLOCKER_ROOT_CAUSE.md')),
      C.rel(artifact('FULL_HEAD_PATCH_REMEDIATION_RESULT.json')),
      C.rel(artifact('FULL_HEAD_PATCH_HEADER_VALIDATION.json')),
      C.rel(artifact('FULL_HEAD_PATCH_REPLAY_SELF_TEST.json')),
      C.rel(artifact('NT01_LINKED_RETRY_AUTHORIZATION.json')),
      C.rel(artifact('ATTEMPT_ALLOCATION_WAL.ndjson')),
      C.rel(artifact('ATTEMPT_LEDGER_RECONCILIATION.json')),
      C.rel(artifact('FINAL_REGISTRY_WAL_RECONCILIATION.json')),
      C.rel(path.join(C.ATT, technicalRecovery.technicalAttemptId, 'ATTEMPT.json')),
      C.rel(path.join(C.ATT, technicalRecovery.technicalAttemptId, 'TECHNICAL_FAILURE.json')),
      C.rel(path.join(
        C.ATT,
        technicalRecovery.technicalAttemptId,
        'EXECUTOR_TECHNICAL_STOP_RECOVERY.json',
      )),
      C.rel(path.join(
        C.ATT,
        technicalRecovery.technicalAttemptId,
        'C34_CANDIDATE_DELTA_REPLAY.json',
      )),
      C.rel(path.join(C.ATT, technicalRecovery.linkedRetryAttemptId, 'ATTEMPT.json')),
      C.rel(path.join(C.ATT, technicalRecovery.linkedRetryAttemptId, 'ITERATION_RESULT.json')),
      C.rel(path.join(
        C.ATT,
        technicalRecovery.linkedRetryAttemptId,
        'C34_CANDIDATE_DELTA_REPLAY.json',
      )),
      C.rel(path.join(C.ATT, technicalRecovery.linkedRetryAttemptId, 'FULL_HEAD_DIFF.patch')),
      C.rel(path.join(C.ATT, technicalRecovery.linkedRetryAttemptId, 'FULL_HEAD_REPLAY.json')),
    ]
    : [];
  for (const requiredPath of [
    C.rel(artifact('REVIEW_BINDING_SPEC.json')),
    C.rel(artifact('INDEPENDENT_REVIEW_REQUEST.md')),
    C.rel(artifact('PRE_REVIEW_EXECUTION_REPORT.json')),
    C.rel(artifact('PREPARED_KNOWLEDGE_INSTALLATION_PLAN.json')),
    C.rel(artifact('PREPARED_ROADMAP_V9.md')),
    C.rel(artifact('REVIEWED_STATE_INVENTORY.json')),
    'evaluation/runner/phase-10a14-r20/commit5r1c34-execute.mjs',
    'evaluation/runner/phase-10a14-r20/commit5r1c34-lib.mjs',
    'evaluation/results/phase-10a14-r20/CANONICAL_ATTEMPT_REGISTRY.json',
    ...technicalRecoveryRequiredPaths,
  ]) {
    C.requirePass(
      manifestVerification.records.some((record) => record.path === requiredPath),
      `C34_REVIEW_MANIFEST_REQUIRED_PATH_MISSING_${requiredPath}`,
    );
  }
  const reviewedState = C.readJson(artifact('REVIEWED_STATE_INVENTORY.json'));
  const allowed = [
    'APPROVED',
    'APPROVED_WITH_NONBLOCKING_OBSERVATIONS',
    'REJECTED',
  ];
  C.requirePass(allowed.includes(review.decision), `C34_OPUS_DECISION_${review.decision}`);
  C.requirePass(
    review.reviewedStateDigest === manifestVerification.sha256
      && reviewedState.preReviewManifestPath
        === C.rel(artifact('PRE_REVIEW_EVIDENCE_MANIFEST.sha256'))
      && reviewedState.reviewedStateDigestDefinition
        === 'lowercase SHA-256 of the exact pre-review evidence manifest bytes',
    'C34_OPUS_REVIEWED_STATE_DIGEST_MISMATCH',
  );
  C.requirePass(review.reviewerTool === 'Claude Code', 'C34_REVIEWER_TOOL_IDENTITY');
  C.requirePass(review.reviewerModel === 'claude-opus-4-8', 'C34_REVIEWER_MODEL_DECLARATION');
  C.requirePass(review.independenceConfirmed === true, 'C34_REVIEW_INDEPENDENCE_NOT_CONFIRMED');
  C.requirePass(review.readOnlyConfirmed === true, 'C34_REVIEW_READ_ONLY_NOT_CONFIRMED');
  C.requirePass(
    review.verification
      && JSON.stringify(Object.keys(review.verification).sort())
        === JSON.stringify([...CLAUDE_REVIEW_VERIFICATION_KEYS].sort())
      && CLAUDE_REVIEW_VERIFICATION_KEYS.every((key) =>
        typeof review.verification[key] === 'boolean'),
    'C34_REVIEW_STRUCTURED_VERIFICATION_INVALID',
  );
  if (review.decision === 'REJECTED') {
    const ordinal = nextReviewRejectionOrdinal();
    const suffix = String(ordinal).padStart(2, '0');
    const rejectionJson = artifact(`OPUS_REVIEW_REJECTION_${suffix}.json`);
    const rejectionMd = artifact(`OPUS_REVIEW_REJECTION_${suffix}.md`);
    writeOnceJson(rejectionJson, {
      unit: UNIT,
      generatedUtc: C.now(),
      reviewer: {
        tool: review.reviewerTool,
        model: review.reviewerModel,
        mode: 'read-only',
      },
      inputEnvelopeSha256: C.sha(inputBytes),
      payload: review,
      decision: 'REJECTED',
      commitAuthorized: false,
    });
    writeOnceText(
      rejectionMd,
      `# C34 Opus review rejection ${suffix}

- Reviewer: Claude Code Opus 4.8
- Mode: read-only
- Reviewed-state digest: \`${review.reviewedStateDigest}\`
- Decision: **REJECTED**

${review.summary || ''}

## Blocking findings

${(review.blockingFindings || []).map((finding) => `- ${finding}`).join('\n') || '- Unspecified blocking finding.'}
`,
    );
    checkpoint({
      stage: 'independent review',
      status: 'REJECTED_STOP',
      activeBaseHash: C.readJson(REGISTRY).selectedSemanticRuntime.identity.servicesTreeDigest,
      attemptId: C.readJson(REGISTRY).selectedSemanticRuntime.attemptId,
      artifacts: [rejectionJson, rejectionMd],
      nextExactOperation: 'Stop without staging or commit; resolve blocking review findings under a separately authorized continuation.',
      safeToResume: false,
      blocker: 'Claude Code Opus 4.8 returned REJECTED.',
    });
    console.log(JSON.stringify({
      unit: UNIT,
      reviewDecision: 'REJECTED',
      rejectionJson: C.rel(rejectionJson),
      commitAuthorized: false,
    }, null, 2));
    process.exitCode = 2;
    return;
  }
  C.requirePass(
    (review.blockingFindings || []).length === 0,
    'C34_APPROVED_REVIEW_HAS_BLOCKING_FINDINGS',
  );
  C.requirePass(
    CLAUDE_REVIEW_VERIFICATION_KEYS.every((key) => review.verification[key] === true),
    `C34_APPROVED_REVIEW_VERIFICATION_FAILED_${JSON.stringify(review.verification)}`,
  );
  C.requirePass(review.commitSafe === true, 'C34_OPUS_DID_NOT_CONFIRM_COMMIT_SAFE');
  const envelopePath = artifact('INDEPENDENT_REVIEW_CLI_ENVELOPE.json');
  fs.copyFileSync(inputAbsolute, envelopePath, fs.constants.COPYFILE_EXCL);
  const reviewJson = artifact('INDEPENDENT_REVIEW.json');
  const reviewMd = artifact('INDEPENDENT_REVIEW.md');
  const canonicalReview = {
    unit: UNIT,
    generatedUtc: C.now(),
    reviewer: {
      tool: review.reviewerTool,
      model: review.reviewerModel,
      displayName: 'Claude Code Opus 4.8',
      reasoning: 'highest available',
      mode: 'READ_ONLY_FINAL_REVIEW',
      independentOfC34Execution: true,
    },
    reviewedCommit: C.START_HEAD,
    reviewedStateDigest: review.reviewedStateDigest,
    cliEnvelope: {
      artifact: C.rel(envelopePath),
      rawBytes: inputBytes.length,
      rawSha256: C.sha(inputBytes),
      resolvedCliPath: capture.resolvedCliPath,
      cliVersion: capture.cliVersion,
      argv: capture.argv,
      rawStdoutSha256: capture.rawStdoutSha256,
      modelUsageKeys,
      permissionDenials: envelope.permission_denials,
    },
    payload: review,
    decision: review.decision,
    pass: true,
  };
  writeOnceJson(reviewJson, canonicalReview);
  writeOnceText(
    reviewMd,
    `# COMMIT 5R1-C34 Independent Review

- Reviewer: Claude Code Opus 4.8 (\`claude-opus-4-8\`)
- Mode: read-only final review
- Reviewed-state digest: \`${review.reviewedStateDigest}\`
- Decision: **${review.decision}**

${review.summary || ''}

## Blocking findings

- None.

## Nonblocking observations

${(review.nonblockingObservations || []).map((observation) => `- ${observation}`).join('\n') || '- None.'}
`,
  );
  const registry = C.readJson(REGISTRY);
  checkpoint({
    stage: 'independent review',
    status: review.decision,
    activeBaseHash: registry.selectedSemanticRuntime.identity.servicesTreeDigest,
    attemptId: registry.selectedSemanticRuntime.attemptId,
    artifacts: [reviewJson, reviewMd, envelopePath],
    nextExactOperation: 'Install the exact reviewed Roadmap v9 bytes, then the matching exact reviewed CURRENT_STATE bytes.',
    safeToResume: true,
  });
  const installation = C.readJson(artifact('PREPARED_KNOWLEDGE_INSTALLATION_PLAN.json'));
  const roadmapInstalled = installPreparedFile(
    installation.roadmap.source,
    installation.roadmap.target,
    installation.roadmap.expectedOldRawSha256,
  );
  C.requirePass(
    roadmapInstalled.rawSha256 === C.sha(fs.readFileSync(abs(installation.roadmap.source))),
    'C34_ROADMAP_INSTALLATION_DRIFT',
  );
  checkpoint({
    stage: 'Roadmap',
    status: 'INSTALLED_EXACT_REVIEWED_BYTES',
    activeBaseHash: registry.selectedSemanticRuntime.identity.servicesTreeDigest,
    attemptId: registry.selectedSemanticRuntime.attemptId,
    artifacts: [ROADMAP, reviewJson],
    nextExactOperation: 'Install CURRENT_STATE as the final substantive knowledge-file change.',
    safeToResume: true,
  });
  const selectedVariant = installation.currentStateVariants[review.decision];
  C.requirePass(selectedVariant, `C34_CURRENT_STATE_VARIANT_MISSING_${review.decision}`);
  const currentInstalled = installPreparedFile(
    selectedVariant.path,
    installation.currentStateTarget,
    installation.expectedCurrentStateOldRawSha256,
  );
  C.requirePass(
    currentInstalled.rawSha256 === selectedVariant.rawSha256,
    'C34_CURRENT_STATE_INSTALLATION_DRIFT',
  );
  checkpoint({
    stage: 'CURRENT_STATE',
    status: 'INSTALLED_FINAL_SUBSTANTIVE_KNOWLEDGE_CHANGE',
    activeBaseHash: registry.selectedSemanticRuntime.identity.servicesTreeDigest,
    attemptId: registry.selectedSemanticRuntime.attemptId,
    artifacts: [CURRENT_STATE, ROADMAP, reviewJson],
    nextExactOperation: 'Write final postcheck and execution report, seal the tracked checkpoint, then generate the self-excluding manifest.',
    safeToResume: true,
  });
  const devBefore = C.readJson(artifact('DEV_FACTORY_PREEXISTING_STATE.json'));
  const residueBefore = preReviewReport.recovery?.technicalRecovery
    ? C.readJson(TECHNICAL_RECOVERY_PREALLOCATION)
      .protectedResidueContinuity.recoveryBaseline
    : C.readJson(artifact('PROTECTED_RESIDUE_BASELINE.json'));
  const devAfter = devFactoryState('post-review-finalization');
  const residueAfter = protectedResidue('post-review-finalization');
  const servicesDiff = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    ...L.SERVICES.map((name) => `services/${name}`),
  ).trim();
  const v8v7Diff = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
    'knowledge/TINA_Updated_Roadmap_v7.md',
  ).trim();
  const oracleDiff = git(
    'diff',
    '--name-only',
    'HEAD',
    '--',
    'evaluation/oracles',
  ).trim();
  const stagedDiff = git('diff', '--cached', '--name-only').trim();
  const stagedServiceDiff = git(
    'diff',
    '--cached',
    '--name-only',
    '--',
    ...L.SERVICES.map((name) => `services/${name}`),
  ).trim();
  const stagedLegacyRoadmapDiff = git(
    'diff',
    '--cached',
    '--name-only',
    '--',
    'knowledge/TINA_Updated_Controlling_Roadmap_v8.md',
    'knowledge/TINA_Updated_Roadmap_v7.md',
  ).trim();
  const stagedOracleDiff = git(
    'diff',
    '--cached',
    '--name-only',
    '--',
    'evaluation/oracles',
  ).trim();
  const postcheck = {
    unit: UNIT,
    generatedUtc: C.now(),
    reviewDecision: review.decision,
    reviewedStateDigest: review.reviewedStateDigest,
    servicesTrackedDiffEmpty: servicesDiff === '',
    roadmapV8V7Unchanged: v8v7Diff === '',
    oraclesUnchanged: oracleDiff === '',
    stagingEmptyBeforeReviewApprovedCutover: stagedDiff === '',
    stagedServiceDiffEmpty: stagedServiceDiff === '',
    stagedLegacyRoadmapDiffEmpty: stagedLegacyRoadmapDiff === '',
    stagedOracleDiffEmpty: stagedOracleDiff === '',
    gitIndexLockAbsent: !fs.existsSync(path.join(C.REPO, '.git', 'index.lock')),
    devFactoryUnchanged: devBefore.head === devAfter.head
      && devBefore.statusSha256 === devAfter.statusSha256
      && devBefore.trackedDiffSha256 === devAfter.trackedDiffSha256,
    protectedResidueUnchanged:
      protectedResidueKey(residueBefore) === protectedResidueKey(residueAfter),
    roadmapInstalled,
    currentStateInstalled: currentInstalled,
    registry: {
      totalAttempts: registry.summary.totalAttempts,
      orphan: registry.summary.orphan,
      dangling: registry.summary.dangling,
      running: registry.summary.c34RunningAttemptIds,
    },
  };
  postcheck.pass = postcheck.servicesTrackedDiffEmpty
    && postcheck.roadmapV8V7Unchanged
    && postcheck.oraclesUnchanged
    && postcheck.stagingEmptyBeforeReviewApprovedCutover
    && postcheck.stagedServiceDiffEmpty
    && postcheck.stagedLegacyRoadmapDiffEmpty
    && postcheck.stagedOracleDiffEmpty
    && postcheck.gitIndexLockAbsent
    && postcheck.devFactoryUnchanged
    && postcheck.protectedResidueUnchanged
    && postcheck.registry.orphan === 0
    && postcheck.registry.dangling === 0
    && postcheck.registry.running.length === 0;
  C.requirePass(postcheck.pass, `C34_FINALIZATION_POSTCHECK_${JSON.stringify(postcheck)}`);
  const postcheckPath = artifact('FINALIZATION_POSTCHECK.json');
  writeOnceJson(postcheckPath, postcheck);
  const preReport = C.readJson(artifact('PRE_REVIEW_EXECUTION_REPORT.json'));
  const finalReport = {
    ...preReport,
    generatedUtc: C.now(),
    independentReview: {
      requiredReviewer: 'Claude Code Opus 4.8',
      exactModel: 'claude-opus-4-8',
      mode: 'read-only',
      decision: review.decision,
      reviewedStateDigest: review.reviewedStateDigest,
      artifact: C.rel(reviewJson),
      cliEnvelope: C.rel(envelopePath),
    },
    knowledgeInstallation: {
      roadmap: roadmapInstalled,
      currentState: currentInstalled,
      roadmapInstalledPenultimate: true,
      currentStateInstalledLast: true,
    },
    finalizationPostcheck: postcheck,
    finalManifest: {
      status: 'GENERATED_AFTER_THIS_REPORT_AND_TRACKED_CHECKPOINT_CUTOVER',
      path: 'evaluation/results/phase-10a14-r20/COMMIT_5R1C34_EVIDENCE_MANIFEST.sha256',
      selfExcluding: true,
    },
    checkpointCutover: {
      trackedCheckpointSealedBeforeManifest: true,
      postStagingCommitPushVerification:
        'performed externally after the manifest is sealed because mutating a tracked checkpoint after commit/push would invalidate both the manifest and clean-tree requirement',
    },
    pass: true,
  };
  const finalReportPath = artifact('FINAL_EXECUTION_REPORT.json');
  writeOnceJson(finalReportPath, finalReport);
  checkpoint({
    stage: 'manifest cutover',
    status: 'TRACKED_EVIDENCE_SEALED_READY_FOR_MANIFEST',
    activeBaseHash: registry.selectedSemanticRuntime.identity.servicesTreeDigest,
    attemptId: registry.selectedSemanticRuntime.attemptId,
    artifacts: [
      finalReportPath,
      postcheckPath,
      reviewJson,
      reviewMd,
      ROADMAP,
      CURRENT_STATE,
      REGISTRY,
    ],
    nextExactOperation:
      'Generate the self-excluding manifest, explicitly stage authorized paths, commit, push, and verify externally without mutating sealed tracked evidence.',
    safeToResume: true,
    blocker: null,
  });
  const manifest = makeEvidenceManifest(artifact('EVIDENCE_MANIFEST.sha256'));
  console.log(JSON.stringify({
    unit: UNIT,
    reviewDecision: review.decision,
    reviewedStateDigest: review.reviewedStateDigest,
    finalReport: C.rel(finalReportPath),
    manifest,
    readyToStage: true,
  }, null, 2));
}

async function staticAudit() {
  const protectedQueries = C.protectedQueryInventory();
  const frozen = new Set(protectedQueries.map((row) => normalizeQuery(row.query)));
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tina-c34-static-audit-'));
  try {
    const base = path.join(temporaryRoot, 'base');
    C.reconstructCommittedSnapshot(base);
    let activeDirectory = base;
    let activeGates = await C.directGatesForDirectory(base);
    C.requirePass(exactBaseMetrics(activeGates), 'C34_STATIC_AUDIT_BASE_METRICS');
    const candidates = [];
    for (let index = 0; index < CANDIDATES.length; index++) {
      const candidate = CANDIDATES[index];
      const queries = [
        ...Object.values(candidate.packet).flat(),
        ...candidate.leaveFamilyOut,
      ];
      const normalized = queries.map(normalizeQuery);
      const duplicates = [...new Set(
        normalized.filter((query, queryIndex) => normalized.indexOf(query) !== queryIndex),
      )];
      const frozenCopies = queries.filter((query) => frozen.has(normalizeQuery(query)));
      const runtime = path.join(temporaryRoot, `candidate-${index + 1}`);
      C.materializeCandidate(activeDirectory, runtime, [candidate.block]);
      const check = spawnSync(
        process.execPath,
        ['--check', path.join(runtime, 'philippine-tax-intent-analyzer.js')],
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
      );
      const [baseAnalyze, candidateAnalyze, gates] = await Promise.all([
        C.loadAnalyzerFrom(activeDirectory, `c34-static-${index + 1}-base`),
        C.loadAnalyzerFrom(runtime, `c34-static-${index + 1}-candidate`),
        C.directGatesForDirectory(runtime),
      ]);
      const generalization = C.executePacket(candidate, baseAnalyze, candidateAnalyze);
      const leaveOneFamilyOut = C.leaveFamilyOut(candidate, candidateAnalyze);
      const rowLevel = C.collectRows(baseAnalyze, candidateAnalyze);
      const semanticPass = gates.frozenLocksHeld
        && rowLevel.newlyCorrected.length
          >= candidate.forecastCorrections - (candidate.forecastTolerance || 0)
        && rowLevel.newlyCorrected.length <= candidate.forecastCorrections
        && gates.metrics.reasonPassed
          === activeGates.metrics.reasonPassed + rowLevel.newlyCorrected.length
        && rowLevel.newlyRegressed.length === 0
        && rowLevel.wrongToDifferentWrong.length === 0
        && rowLevel.priorOverrideChanges.length === 0
        && rowLevel.outsideTarget.length === 0
        && rowLevel.changedSignatures.length === rowLevel.newlyCorrected.length
        && JSON.stringify(gates.structuralDiagnostics)
          === JSON.stringify(activeGates.structuralDiagnostics)
        && generalization.pass
        && leaveOneFamilyOut.pass;
      const result = {
        candidateId: candidate.id,
        categories: Object.fromEntries(
          Object.entries(candidate.packet).map(([name, rows]) => [name, rows.length]),
        ),
        leaveOneFamilyOut: candidate.leaveFamilyOut.length,
        totalQueries: queries.length,
        duplicates,
        frozenCopies,
        sourceSyntaxStatus: check.status,
        sourceSyntaxStderr: (check.stderr || '').trim(),
        semantic: {
          activeBaseReasonPassed: activeGates.metrics.reasonPassed,
          candidateReasonPassed: gates.metrics.reasonPassed,
          forecastCorrections: candidate.forecastCorrections,
          forecastTolerance: candidate.forecastTolerance || 0,
          forecastMinimum:
            candidate.forecastCorrections - (candidate.forecastTolerance || 0),
          newlyCorrected: rowLevel.newlyCorrected.length,
          newlyRegressed: rowLevel.newlyRegressed.length,
          wrongToDifferentWrong: rowLevel.wrongToDifferentWrong.length,
          outsideTarget: rowLevel.outsideTarget.length,
          changedSignatures: rowLevel.changedSignatures.length,
          frozenLocksHeld: gates.frozenLocksHeld,
          packetPassedRows: generalization.passedRows,
          packetExecutedRows: generalization.executedRows,
          packetFailures: generalization.failedRows.map((row) => ({
            category: row.category,
            query: row.query,
            base: row.base,
            candidate: row.candidate,
          })),
          positiveCandidateFirings: generalization.positiveCandidateFirings,
          leaveOneFamilyOutPassed:
            leaveOneFamilyOut.records.filter((record) => record.pass).length,
          leaveOneFamilyOutTotal: leaveOneFamilyOut.records.length,
          leaveOneFamilyOutFailures:
            leaveOneFamilyOut.records.filter((record) => !record.pass),
          pass: semanticPass,
        },
        pass: duplicates.length === 0
          && frozenCopies.length === 0
          && check.status === 0
          && candidate.packet.positives.length >= 8
          && candidate.packet.substitutions.length >= 8
          && candidate.packet.nearMisses.length >= 8
          && candidate.packet.constructions.length >= 4
          && candidate.packet.fillers.length >= 5
          && candidate.packet.skeletons.length >= 5
          && (!candidate.taglishApplicable || candidate.packet.taglish.length >= 3)
          && candidate.leaveFamilyOut.length >= 5
          && semanticPass,
      };
      candidates.push(result);
      if (result.pass) {
        activeDirectory = runtime;
        activeGates = gates;
      }
    }
    const result = {
      unit: UNIT,
      hypotheses: HYPOTHESES.length,
      protectedQuerySources: [...new Set(protectedQueries.map((row) => row.source))],
      protectedQueryCount: protectedQueries.length,
      candidates,
      pass: HYPOTHESES.length === 18 && candidates.every((candidate) => candidate.pass),
    };
    C.requirePass(result.pass, `C34_STATIC_AUDIT_FAILED_${JSON.stringify(result)}`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    removeOwnedTemp(temporaryRoot, 'tina-c34-static-audit-');
  }
}

async function main() {
  const selectedModes = [
    '--static-audit',
    '--blocker-recovery-self-test',
    '--prepare-blocker-recovery',
    '--technical-recovery-audit',
    '--process-inspection-audit',
    '--timeboxed-compatibility',
    '--timeboxed-no-allocation-preflight',
    '--timeboxed-linked-retry',
    '--timeboxed-safe-pause',
    '--execute',
    '--resume-linked-retry',
    '--invoke-opus-review',
    '--finalize-review',
  ].filter((mode) => process.argv.includes(mode));
  C.requirePass(
    selectedModes.length === 1,
    `C34_EXACTLY_ONE_MODE_REQUIRED_${JSON.stringify(selectedModes)}`,
  );
  if (selectedModes[0] === '--static-audit') {
    await staticAudit();
    return;
  }
  if (selectedModes[0] === '--blocker-recovery-self-test') {
    const result = runFullHeadPatchRecoverySelfTests();
    C.requirePass(result.pass, 'C34_BLOCKER_RECOVERY_SELF_TEST_NOT_PASSING');
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (selectedModes[0] === '--prepare-blocker-recovery') {
    prepareFullHeadPatchBlockerRecovery();
    return;
  }
  if (selectedModes[0] === '--technical-recovery-audit') {
    const recovery = technicalRecoveryPreflight();
    console.log(JSON.stringify(recovery.result, null, 2));
    return;
  }
  if (selectedModes[0] === '--process-inspection-audit') {
    const result = processAndPortState();
    C.requirePass(
      result.processInspectionSucceeded
        && result.allNodeCommandLinesReadable
        && result.activeC34RunnerCount === 0
        && result.netstatInspectionStatus === 0
        && result.port5173Free,
      `C34_PROCESS_INSPECTION_AUDIT_FAILED_${JSON.stringify(result)}`,
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (selectedModes[0] === '--timeboxed-compatibility') {
    timeboxedCompatibilityValidation();
    return;
  }
  if (selectedModes[0] === '--timeboxed-no-allocation-preflight') {
    timeboxedNoAllocationPreflight();
    return;
  }
  if (selectedModes[0] === '--timeboxed-linked-retry') {
    const result = await resumeLinkedRetry({ stopAfterLinkedRetry: true });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (selectedModes[0] === '--timeboxed-safe-pause') {
    timeboxedSafePause();
    return;
  }
  if (selectedModes[0] === '--execute') {
    await execute();
    return;
  }
  if (selectedModes[0] === '--resume-linked-retry') {
    await resumeLinkedRetry();
    return;
  }
  if (selectedModes[0] === '--invoke-opus-review') {
    invokeOpusReview();
    return;
  }
  if (selectedModes[0] === '--finalize-review') {
    const index = process.argv.indexOf('--finalize-review');
    await finalizeReview(process.argv[index + 1]);
    return;
  }
  throw new Error(
    'C34_EXPLICIT_MODE_REQUIRED',
  );
}

try {
  await main();
} catch (error) {
  if (
    process.argv.includes('--static-audit')
    || process.argv.includes('--blocker-recovery-self-test')
    || process.argv.includes('--technical-recovery-audit')
    || process.argv.includes('--process-inspection-audit')
    || process.argv.includes('--timeboxed-compatibility')
    || process.argv.includes('--timeboxed-no-allocation-preflight')
    || process.argv.includes('--timeboxed-linked-retry')
    || process.argv.includes('--timeboxed-safe-pause')
  ) {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
  } else {
  let liveServiceProtection;
  try {
    const serviceDiff = git(
      'diff',
      '--name-only',
      'HEAD',
      '--',
      ...L.SERVICES.map((name) => `services/${name}`),
    ).trim();
    liveServiceProtection = {
      inspected: true,
      trackedServiceDiff: serviceDiff,
      trackedServiceDiffEmpty: serviceDiff === '',
      restoreAttempted: false,
      overwriteAttempted: false,
      unownedDiffPreserved: serviceDiff !== '',
      reason: serviceDiff === ''
        ? 'No live service change existed; all C34 work is isolated.'
        : 'A live service diff is not proven runner-owned and was preserved without overwrite.',
    };
  } catch (inspectionError) {
    liveServiceProtection = {
      inspected: false,
      inspectionError: inspectionError?.stack || String(inspectionError),
      restoreAttempted: false,
      overwriteAttempted: false,
      unownedDiffPreserved: true,
    };
  }
  const recoveryMode = process.argv.includes('--prepare-blocker-recovery')
    || process.argv.includes('--resume-linked-retry')
    || process.argv.includes('--invoke-opus-review')
    || process.argv.includes('--finalize-review');
  const executionMode = process.argv.includes('--prepare-blocker-recovery')
    ? 'FULL_HEAD_PATCH_BLOCKER_RECOVERY_PREPARATION'
    : process.argv.includes('--resume-linked-retry')
      ? 'LINKED_TECHNICAL_RETRY'
      : process.argv.includes('--invoke-opus-review')
        ? 'INVOKE_INDEPENDENT_OPUS_REVIEW'
        : process.argv.includes('--finalize-review')
          ? 'FINALIZE_INDEPENDENT_REVIEW'
          : 'INITIAL_EXECUTION';
  let blockerPath = artifact(
    recoveryMode ? 'TECHNICAL_RECOVERY_BLOCKER_01.json' : 'TECHNICAL_BLOCKER.json',
  );
  if (recoveryMode) {
    let ordinal = 1;
    while (fs.existsSync(blockerPath)) {
      ordinal++;
      blockerPath = artifact(`TECHNICAL_RECOVERY_BLOCKER_${String(ordinal).padStart(2, '0')}.json`);
    }
  }
  if (!fs.existsSync(blockerPath)) {
    const registry = fs.existsSync(REGISTRY) ? C.readJson(REGISTRY) : null;
    const latestC34Attempt = registry?.attempts
      ?.filter((attempt) => attempt.attemptId.includes('commit5r1c34-'))
      .at(-1) || null;
    writeOnceJson(blockerPath, {
      unit: UNIT,
      generatedUtc: C.now(),
      classification: 'TECHNICAL_INCOMPLETE',
      executionMode,
      latestC34AttemptId: latestC34Attempt?.attemptId || null,
      error: error?.stack || String(error),
      semanticDisposition: 'NOT_A_SEMANTIC_REJECTION',
      servicesRestorationAttempted: false,
      liveServiceProtection,
    });
  }
  try {
    const registry = fs.existsSync(REGISTRY) ? C.readJson(REGISTRY) : null;
    const latestC34Attempt = registry?.attempts
      ?.filter((attempt) => attempt.attemptId.includes('commit5r1c34-'))
      .at(-1) || null;
    checkpoint({
      stage: 'executor technical stop',
      status: 'BLOCKED_TECHNICAL_INCOMPLETE',
      activeBaseHash:
        latestC34Attempt?.semanticBase?.servicesTreeDigest
        || registry?.selectedSemanticRuntime?.identity?.servicesTreeDigest
        || C.C33_IDENTITY.servicesTreeDigest,
      attemptId: latestC34Attempt?.attemptId
        || registry?.selectedSemanticRuntime?.attemptId
        || null,
      artifacts: [blockerPath],
      nextExactOperation: 'Forensically inspect the technical blocker and any running C34 attempt before a linked retry.',
      safeToResume: false,
      blocker: error?.message || String(error),
    });
  } catch (checkpointError) {
    console.error(`C34_TECHNICAL_CHECKPOINT_FAILED ${checkpointError.stack || checkpointError}`);
  }
  console.error(error?.stack || String(error));
  process.exitCode = 1;
  }
}
