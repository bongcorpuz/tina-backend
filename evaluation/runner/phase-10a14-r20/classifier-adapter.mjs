// PHASE-10A14-R20 governed tooling — classifier adapter.
// Invokes the UNCHANGED runtime boundary classifier and normalizes its output
// FOR REPORTING ONLY. Adds no decision logic. The runtime is the sole source
// of the decision under test.

import { pathToFileURL } from 'node:url';
import { REPO } from './identity.mjs';

const mod = await import(
  pathToFileURL(`${REPO}/services/philippine-tax-domain-boundary.js`).href
);
const detect = mod.detectPhilippineTaxBoundary;

// Canonical decision mapping (frozen COMMIT 2 contract):
//   ALLOW -> ALLOW ; NOT_ALLOW -> REFUSE ; REFUSE -> REFUSE ; CLARIFY -> CLARIFY
// Runtime emits ALLOW | REJECT | CLARIFY. REJECT is a raw runtime value that
// canonicalizes to REFUSE (same class as NOT_ALLOW / REFUSE).
export function canonicalizeDecision(raw) {
  if (raw === 'ALLOW') return 'ALLOW';
  if (raw === 'CLARIFY') return 'CLARIFY';
  if (raw === 'NOT_ALLOW' || raw === 'REFUSE' || raw === 'REJECT') return 'REFUSE';
  throw new Error(`unmappable decision value: ${raw}`);
}

export const NORMALIZATION_RULE =
  'ALLOW->ALLOW; NOT_ALLOW->REFUSE; REFUSE->REFUSE; REJECT(runtime)->REFUSE; CLARIFY->CLARIFY';

// Classify a single row against the unchanged runtime using the exact campaign
// invocation: route mode '/ask', empty context.
export function classifyRow(text) {
  const out = detect(text, '/ask', {});
  return {
    actualRawDecision: out.decision,
    actualDecision: canonicalizeDecision(out.decision),
    actualReason: out.reason,
    actualDomain: out.detectedDomain,
    confidence: out.confidence,
  };
}
