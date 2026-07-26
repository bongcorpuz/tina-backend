// PHASE-10A14-R20 COMMIT 5R1-C14 iteration 02 — leading-concessive clause segmentation.
//
// Cause: the comma split fires only when the word AFTER the comma is a connector. A
// LEADING concessive puts the marker at the START of the sentence, so the comma that
// closes the subordinate span is never a split point and the whole sentence becomes one
// primary_task clause. The concessive tax context then supplies the task relation.
//
// Correction (§7A): when normalized text BEGINS with a concessive marker and contains a
// top-level comma, split at that comma — but only when the remainder is a complete
// requested task. Quote-aware and parenthesis-aware by construction, since the split is
// evaluated inside the existing scanner where `quote` and `depth` are already tracked.
const fs = require('fs');
const p = 'services/philippine-tax-intent-analyzer.js';
let s = fs.readFileSync(p, 'utf8');
const before = s;

// ---- 1. concessive markers and the completeness test -------------------------
const anchorA = `const CONNECTORS = Object.freeze(['however', 'although', 'but', 'and', 'pero', 'ngunit', 'kahit', 'at']);`;
if (!s.includes(anchorA)) throw new Error('ANCHOR_MISS CONNECTORS');
const addA = anchorA + `

// C14 clause layer — LEADING CONCESSIVE CONTEXT.
// A sentence that opens with a concessive marker states CONTEXT first and the actual
// request after the comma. The subordinate span must not be able to supply the primary
// task. Matched only at the START of the normalized text.
const LEADING_CONCESSIVE_RE = /^(?:although|even though|though|while|kahit|bagaman)\\b/i;
// The remainder must be a COMPLETE requested task: an imperative (verb-initial), an
// interrogative, or an explicit request. A fragment ("uncertain.") is not a task, so a
// leading concessive with an incomplete remainder must not split.
const COMPLETE_TASK_REMAINDER_RE = /^(?:please\\s+)?(?:[a-z]+(?:e|t|d|n|k|p|w|y|r|l|g|h|s)?\\s+(?:the|a|an|this|that|these|those|all|any|ang|ng|sa|mga)\\b|(?:what|which|who|whom|whose|when|where|why|how|is|are|was|were|do|does|did|can|could|should|would|may|might|will|shall|has|have|had|ano|alin|sino|paano|kailan|saan|bakit|may|magkano|kailangan)\\b|i-[a-z]+\\b|(?:ayusin|linisin|palitan|ilagay|bilhin|gawin|isulat|tanggalin|ihanda)\\b)/i;
const isCompleteTaskRemainder = (t) => {
  const x = String(t == null ? '' : t).trim();
  if (!x) return false;
  // At least two words, and recognisably a task rather than a fragment.
  if (x.split(/\\s+/).filter(Boolean).length < 2) return false;
  return COMPLETE_TASK_REMAINDER_RE.test(x);
};`;
s = s.replace(anchorA, addA);

// ---- 2. the split itself -----------------------------------------------------
// Evaluated inside the existing scanner, so quote/paren awareness and determinism are
// inherited. Fires at most once, on the FIRST top-level comma, and only while the
// buffer so far is still the leading concessive span.
const anchorB = `    if (!quote && depth === 0) {
      const next = words[wi + 1] ? lower(words[wi + 1].replace(/[^a-z]/gi, '')) : '';
      if (/,$/.test(buf.trim()) && CONNECTORS.includes(next)) { pushBuf(); continue; }
    }`;
if (!s.includes(anchorB)) throw new Error('ANCHOR_MISS comma split');
const addB = `    if (!quote && depth === 0) {
      const next = words[wi + 1] ? lower(words[wi + 1].replace(/[^a-z]/gi, '')) : '';
      if (/,$/.test(buf.trim()) && CONNECTORS.includes(next)) { pushBuf(); continue; }
      // C14 — leading concessive: split at the top-level comma that closes the
      // subordinate span, so the request after it becomes its own clause. Guarded by
      // (a) the whole text opening with a concessive marker, (b) no split yet, and
      // (c) the remainder being a complete requested task.
      if (spans.length === 0 && /,$/.test(buf.trim())
          && LEADING_CONCESSIVE_RE.test(text.trim())
          && LEADING_CONCESSIVE_RE.test(buf.trim())
          && isCompleteTaskRemainder(words.slice(wi + 1).join(' '))) {
        pushBuf(); continue;
      }
    }`;
s = s.replace(anchorB, addB);

// ---- 3. primary-task precedence over concessive context (§7D) -----------------
// Segmentation alone does not decide which clause is primary. A concessive CONTEXT
// clause must not win the primary-task score, whatever it contains. Scored by clause
// role structure, never by clause order alone.
const anchorC = `      if (c.quotedOrMentionedOnly) score -= 2;`;
if (!s.includes(anchorC)) throw new Error('ANCHOR_MISS primary scoring');
const addC = `      if (c.quotedOrMentionedOnly) score -= 2;
      // C14 — a leading concessive clause states context, not the request. It is
      // demoted so the main requested clause controls, per the precedence spec.
      if (i === 0 && clauses.length > 1 && LEADING_CONCESSIVE_RE.test(c.text.trim())) score -= 4;`;
s = s.replace(anchorC, addC);

// ---- 4. a concessive context predicate must not govern the primary target ----
// §8B/§7D: relation building tests the WHOLE text (`fullLo`) in several places. Once a
// leading concessive is its own context clause, a tax predicate living only inside that
// context must not build the controlling task relation for an ordinary primary task.
// This is scoping, not suppression: when the primary clause itself carries the tax
// predicate, or the primary task is not an ordinary action, nothing changes.
const anchorD = `  const isNonTaxVerb = NON_TAX_VERBS.includes(primary.taskVerb) && primary.taskVerb !== 'quote';`;
if (!s.includes(anchorD)) throw new Error('ANCHOR_MISS isNonTaxVerb');
const addD = `  const isNonTaxVerb = NON_TAX_VERBS.includes(primary.taskVerb) && primary.taskVerb !== 'quote';
  // C14 — CONCESSIVE-SCOPED TAX PREDICATE.
  // True when a leading concessive context clause exists, the tax predicate appears
  // ONLY in that context, and the primary clause requests an ordinary action. The
  // controlling relation must then come from the primary task, not the concession.
  const TAX_PREDICATE_SCOPE_RE = /\\b(?:taxab\\w*|deductib\\w*|dutiable|vatable|subject to (?:vat|tax|withholding|customs|excise|percentage tax)|withholding tax|input vat|output vat|customs dut\\w*|excise tax|exempt)\\b/i;
  const concessiveContextClause = clauses.length > 1
    && LEADING_CONCESSIVE_RE.test(String(clauses[0].text || '').trim())
    && clauses[0].clauseId !== primary.clauseId;
  const primaryLo = lower(primary.text);
  const taxPredicateOnlyInConcessive = concessiveContextClause
    && TAX_PREDICATE_SCOPE_RE.test(lower(clauses[0].text))
    && !TAX_PREDICATE_SCOPE_RE.test(primaryLo);
  // The primary task is an ordinary action: a recognised non-tax verb, or a
  // verb-initial archival / file-management imperative. A primary clause that ASKS a
  // tax question is excluded, so a concession never displaces a genuine tax task.
  const primaryIsTaxQuestion = /\\b(?:tax|taxes|taxed|taxab\\w*|buwis|vat|withhold\\w*|excise|customs|tariff|dutiable|revenue|bir|deductib\\w*)\\b/i.test(primaryLo);
  const ordinaryImperativeVerb = /^(?:please\\s+)?(?:archive|store|move|copy|back\\s?up|rearrange|relabel|reorder|upload|export|attach|duplicate)\\b/i.test(primaryLo.trim());
  const primaryRequestsOrdinaryAction = (NON_TAX_VERBS.includes(primary.taskVerb) || RE.nonTaxAction.test(primaryLo) || RE.filipinoAction.test(primaryLo) || ordinaryImperativeVerb)
    && !primaryIsTaxQuestion;
  const concessiveTaxContextOverOrdinaryTask = taxPredicateOnlyInConcessive && primaryRequestsOrdinaryAction;
  if (concessiveTaxContextOverOrdinaryTask) {
    add('REQUESTS_NON_TAX_ACTION_ON', primary.taskVerb || 'action', primary.taskObject || 'object');
    return relations;
  }`;
s = s.replace(anchorD, addD);

// ---- 5. scope the decision-layer flag to the primary clause ------------------
// `taxRelationOverPrimaryTarget` is computed over the WHOLE text, so a tax predicate
// sitting in the concessive context still claimed the primary target and kept the
// non-tax-task branch from firing. Scope it: a predicate confined to a leading
// concessive context clause does not govern the PRIMARY target. Named exactly after
// what it asserts, so the decision layer needs no change.
const anchorE = `  const taxRelationOverPrimaryTarget = /\\b(?:vatable|subject to (?:vat|tax|withholding|customs|excise|percentage tax|final tax)|i-?withhold ang buwis sa|buwis sa|may vat ba ang|deductible ba ang|tamang bir form para sa)\\b/i.test(fullLo);`;
if (!s.includes(anchorE)) throw new Error('ANCHOR_MISS taxRelationOverPrimaryTarget');
const addE = `  const TAX_OVER_TARGET_RE = /\\b(?:vatable|subject to (?:vat|tax|withholding|customs|excise|percentage tax|final tax)|i-?withhold ang buwis sa|buwis sa|may vat ba ang|deductible ba ang|tamang bir form para sa)\\b/i;
  // C14 — a tax predicate confined to a LEADING CONCESSIVE context clause states
  // context and does not govern the primary target. When the primary clause carries
  // the predicate itself, the flag is unchanged.
  const concessiveOnlyTaxContext = clauses.length > 1 && primary
    && LEADING_CONCESSIVE_RE.test(String(clauses[0].text || '').trim())
    && clauses[0].clauseId !== primary.clauseId
    && TAX_OVER_TARGET_RE.test(lower(clauses[0].text))
    && !TAX_OVER_TARGET_RE.test(lower(primary.text))
    // A primary clause that itself asks a tax question keeps its tax reading.
    && !/\\b(?:tax|taxes|taxed|taxab\\w*|buwis|vat|withhold\\w*|excise|customs|dutiable|revenue|bir|deductib\\w*)\\b/i.test(lower(primary.text));
  const taxRelationOverPrimaryTarget = TAX_OVER_TARGET_RE.test(fullLo) && !concessiveOnlyTaxContext;`;
s = s.replace(anchorE, addE);

if (s === before) throw new Error('NO_CHANGE_APPLIED');
fs.writeFileSync(p, s);
console.log('patch-02 applied; bytes', before.length, '->', s.length);
