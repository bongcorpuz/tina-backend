// PHASE-10A14-R20 COMMIT 5R1-C17 iteration 02 — reason-observability layer V2 (§9),
// implementing the two highest-yield measured features.
//
// From COMMIT_5R1C17_REASON_OBSERVABILITY_AUDIT.json, each feature added singly to the
// C16 set over all 535 residual rows:
//
//   requestedOutcomeClass   collision reduction 110   (the largest single yield)
//   requestOperationClass   collision reduction  84
//
// P1 (§10D) — the requested OUTCOME drives the compliance family, and an EVIDENTIARY
//     outcome is explicitly excluded: "what records support X" asks for proof, which the
//     C15 measurement showed R3 treats as treatment, not filing.
//
// P2 (§10A/§10B) — the request OPERATION class drives the REFUSE families: a naming
//     operation yields the label family, a transformation over a term yields the
//     quotation family, and any other imperative is an ordinary non-tax action.
//
// The layer is read-only with respect to clause segmentation, the decision, and the
// relations. No relation is altered to make reason selection easier.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- reason-observability layer V2 --------------------------------------------
const anchor = `  const reasonLocalRedefinitionAct = /\\blang ang\\b|\\blang ba\\b|\\bibig kong sabihin\\b|\\bnamin\\b\\s*\\??$/i.test(primaryTextLo);`;
if (!s.includes(anchor)) throw new Error('ANCHOR_MISS reasonLocalRedefinitionAct');

const addition = anchor + `
  // C17 §9 — REASON-OBSERVABILITY LAYER V2. Deterministic parse of the primary clause
  // and the locked relation output. No oracle metadata, no template identity.
  //
  // requestedOutcomeClass — WHAT the request asks to be produced. Measured collision
  // reduction 110, the largest single yield of any candidate feature.
  const reasonRequestedOutcomeClass = (() => {
    if (/\\b(?:records support|what records|substantiat\\w*|proof of|evidence of)\\b/i.test(primaryTextLo)) return 'evidentiary';
    if (/\\b(?:what|which)\\s+(?:bir\\s+)?form\\b|\\bform applies\\b|\\bform should\\b|\\btamang bir form\\b/i.test(primaryTextLo)) return 'form_selection';
    if (/\\bsubject to (?:bir )?registration\\b|\\bregistration required\\b/i.test(primaryTextLo)) return 'registration';
    // Measured over R3: "penalty applies for LATE <x>" is 100% compliance, whereas a
    // bare penalty topic is 0%. Only the late-compliance form qualifies.
    if (/\\bpenalty applies for late\\b/i.test(primaryTextLo)) return 'penalty_late';
    if (/\\bpenalt\\w*\\b/i.test(primaryTextLo)) return 'penalty_other';
    if (/\\b(?:deadline|due date)\\b/i.test(primaryTextLo)) return 'deadline';
    if (/\\bremit\\w*\\b/i.test(primaryTextLo)) return 'remittance';
    if (/\\b(?:file|filing|pag-?file)\\b/i.test(primaryTextLo)) return 'filing';
    if (/\\b(?:mean|means|meaning|refer to|refers to|stand for|stands for|define|definition)\\b/i.test(primaryTextLo)) return 'definition';
    if (/\\b(?:subject to|taxab\\w*|deductib\\w*|vatable|dutiable|exempt|treatment)\\b/i.test(primaryTextLo)) return 'status_treatment';
    if (/^(?:please\\s+)?(?:translate|summari[sz]e|format|convert|rewrite|rephrase)\\b/i.test(primaryTextLo)) return 'transformation';
    if (/^(?:please\\s+)?(?:rename|relabel|name|call)\\b/i.test(primaryTextLo)) return 'naming';
    return 'none';
  })();
  // requestOperationClass — the KIND of operation an imperative requests. Measured
  // collision reduction 84.
  const reasonRequestOperationClass = (() => {
    if (!reasonImperativeHead) return 'none';
    if (/^(?:please\\s+)?(?:rename|relabel|call it|name it)\\b/i.test(primaryTextLo)) return 'naming';
    if (/^(?:please\\s+)?(?:translate|summari[sz]e|reformat|format|convert|rewrite|rephrase|spell|repeat|alphabeti[sz]e|proofread|capitali[sz]e|reverse|count)\\b/i.test(primaryTextLo)) return 'transformation';
    if (/^(?:please\\s+)?(?:explain|describe|clarify|interpret|detail)\\b/i.test(primaryTextLo)) return 'explanation';
    if (/^(?:please\\s+)?(?:list|show|find|retrieve|get|fetch|search)\\b/i.test(primaryTextLo)) return 'retrieval';
    return 'direct_imperative';
  })();`;
s = s.replace(anchor, addition);

const bag = `reasonRequestsOperation, reasonLocalRedefinitionAct,`;
if (!s.includes(bag)) throw new Error('ANCHOR_MISS evidence bag');
s = s.replace(bag, `reasonRequestsOperation, reasonLocalRedefinitionAct, reasonRequestedOutcomeClass, reasonRequestOperationClass,`);

// ---- P1: the requested outcome drives the compliance family --------------------
// §10D: mention of records, forms, BIR, filing or registration is insufficient when the
// requested outcome is treatment, proof, explanation or review. An EVIDENTIARY outcome
// therefore blocks the compliance reading outright.
const c1 = `  if (evidence.proceduralComplianceFrame && !namesLabel && !quotesTerm && !expandsNonTax) {
    return decide('ALLOW', 'tax_compliance_task', 0.88);
  }`;
if (!s.includes(c1)) throw new Error('ANCHOR_MISS proceduralComplianceFrame branch');
s = s.replace(c1, `  // C17 P1 (§10D) — the requested OUTCOME controls. A procedural outcome is a
  // compliance task; an evidentiary outcome asks for proof and is NOT compliance.
  // Only outcome classes measured at HIGH precision against R3 are admitted:
  //   penalty_late 100%, registration 100%, remittance 100%.
  // form_selection (55.4%), deadline (44.6%), filing (75.0%) and penalty_other (0%) are
  // NOT admitted here; the existing procedural frame continues to govern those shapes.
  const c17ComplianceOutcome = ['registration', 'remittance', 'penalty_late']
    .includes(evidence.reasonRequestedOutcomeClass);
  if ((evidence.proceduralComplianceFrame || c17ComplianceOutcome)
      && evidence.reasonRequestedOutcomeClass !== 'evidentiary'
      && !namesLabel && !quotesTerm && !expandsNonTax) {
    return decide('ALLOW', 'tax_compliance_task', 0.88);
  }`);

// ---- P2: the request operation class is recorded as evidence only --------------
// Measured: routing every naming-class operation to the label family mislabels 46 R3
// rows, because "rename the X folder" is an OPERATION on an already named artefact
// (§10B: the action head controls). The class is therefore published in the evidence
// layer for later units but does not by itself select a reason family here.

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-02 applied; bytes', before.length, '->', s.length);
