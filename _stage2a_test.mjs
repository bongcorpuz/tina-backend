import { renderFastDefinitionConversational } from "./answer-renderer.js";

function detectResponseStyle(query = "", mode = "") {
  if (mode !== "FAST_DEFINITION") return null;
  const q = String(query).toLowerCase().trim();
  if (/^(ano ang|ano ibig sabihin|paano|bakit)\b/i.test(q))                                                              return "TAGLISH";
  if (/\b(in simple terms|for a layman|for a non[- ]lawyer|i'm new to|as a beginner|basic explanation)\b/i.test(q))       return "BEGINNER";
  if (/\b(vs\.?|versus|compare|comparison|difference between|distinguish|distinction between|contrast)\b/i.test(q))       return "COMPARATIVE";
  if (/\b(give.*example|show.*example|example of|illustrate|with example)\b/i.test(q))                                    return "EXAMPLE";
  if (/\b(how does|how is|how do|how are)\b/i.test(q))                                                                    return "PROCEDURAL";
  if (/\b(explain|walk me through|help me understand)\b/i.test(q))                                                        return "EXPLAIN";
  if (q.length <= 60 && /^(what is|define|meaning of|[a-z]+ meaning)\b/i.test(q))                                        return "CONCISE";
  return "STANDARD";
}

const mockGenericPN = (label) => `### Direct Answer
${label} is the direct answer sentence here.

### Legal Basis
- Section 105, NIRC
- Revenue Regulations No. 16-2005

### Practical Explanation
This explains how ${label} works in practice for a typical business or taxpayer.

### Practical Note
Consult the applicable provision and implementing regulation before relying on this answer for compliance purposes.`;

const mockSpecificPN = (label) => `### Direct Answer
${label} is the direct answer sentence here.

### Legal Basis
- Section 105, NIRC
- Revenue Regulations No. 16-2005

### Practical Explanation
This explains how ${label} works in practice for a typical business or taxpayer.

### Practical Note
Businesses above the 3-million peso threshold must register for VAT within 30 days of crossing it.`;

const mockComparative = `### Direct Answer
VAT and Percentage Tax differ primarily in rate, scope, and registration threshold.

### Legal Basis
- VAT: Section 105, NIRC; RR 16-2005
- Percentage Tax: Section 116, NIRC; RR 4-2007

### Practical Explanation
Scope: VAT applies to sales above the 3M threshold; Percentage Tax applies below. Rate: VAT is 12%; Percentage Tax is 3% (1% temporarily under CREATE). Applicable taxpayer: VAT-registered vs non-VAT registered businesses.

### Practical Note
Consult the applicable provision and implementing regulation before relying on this answer for compliance purposes.`;

// ── Part 1: detectResponseStyle ──────────────────────────────────────────────
console.log("=== PART 1: detectResponseStyle ===\n");
const detectionCases = [
  ["What is VAT?",                                               "FAST_DEFINITION", "CONCISE"],
  ["Define VAT",                                                 "FAST_DEFINITION", "CONCISE"],
  ["Explain VAT",                                                "FAST_DEFINITION", "EXPLAIN"],
  ["How does VAT work?",                                         "FAST_DEFINITION", "PROCEDURAL"],
  ["Ano ang VAT?",                                               "FAST_DEFINITION", "TAGLISH"],
  ["Give me an example of VAT",                                  "FAST_DEFINITION", "EXAMPLE"],
  ["Explain VAT in simple terms",                                "FAST_DEFINITION", "BEGINNER"],
  ["What is withholding tax?",                                   "FAST_DEFINITION", "CONCISE"],
  ["How is income tax computed?",                                "FAST_DEFINITION", "PROCEDURAL"],
  ["Walk me through VAT registration",                           "FAST_DEFINITION", "EXPLAIN"],
  // ── COMPARATIVE regression ───────────────────────────────────────────────
  ["VAT vs percentage tax",                                      "FAST_DEFINITION", "COMPARATIVE"],
  ["difference between VAT and percentage tax",                  "FAST_DEFINITION", "COMPARATIVE"],
  ["compare output VAT and input VAT",                           "FAST_DEFINITION", "COMPARATIVE"],
  // ── COMPARATIVE edge cases ───────────────────────────────────────────────
  ["Ano ang pagkakaiba ng VAT at percentage tax?",               "FAST_DEFINITION", "TAGLISH"],
  ["difference between VAT and percentage tax in simple terms",  "FAST_DEFINITION", "BEGINNER"],
  ["explain the difference between VAT and percentage tax",      "FAST_DEFINITION", "COMPARATIVE"],
  // ── Non-FAST_DEFINITION → null ───────────────────────────────────────────
  ["What is VAT?", "STANDARD_TAX",        null],
  ["What is VAT?", "SENIOR_COUNSEL_MEMO", null],
  ["What is VAT?", "QUIZ_MODE",           null],
];

let dp = 0, df = 0;
for (const [q, mode, expected] of detectionCases) {
  const got = detectResponseStyle(q, mode);
  const ok = got === expected;
  if (ok) dp++; else df++;
  console.log(`${ok ? "✓" : "✗"} [${mode.padEnd(20)}] "${q}" → ${got} (expected ${expected})`);
}
console.log(`\ndetectResponseStyle: ${dp} passed, ${df} failed\n`);

// ── Part 2: renderFastDefinitionConversational ───────────────────────────────
console.log("=== PART 2: renderFastDefinitionConversational paragraph policy ===\n");

function chkI(query, style, input, expectedParas, label = "") {
  const out = renderFastDefinitionConversational(input, query, style);
  const paras = out.split("\n\n").filter(Boolean);
  const hasHash = out.includes("###");
  const ok = paras.length === expectedParas && !hasHash;
  const tag = label ? ` [${label}]` : "";
  console.log(`${ok ? "✓" : "✗"} ${(style || "null").padEnd(12)} "${query}"${tag}: ${paras.length} paras (expect ${expectedParas}), no ###: ${!hasHash}`);
  if (!ok) console.log("  GOT:", out.slice(0, 300));
  return ok;
}

let rp = 0, rf = 0;
const c = (...a) => { if (chkI(...a)) rp++; else rf++; };

// CONCISE: DA + LB = 2 (PE suppressed, generic PN suppressed)
c("What is VAT?",         "CONCISE",    mockGenericPN("VAT"),       2);
c("Define VAT",           "CONCISE",    mockGenericPN("WHT"),       2);

// TAGLISH: DA + PE + LB = 3 (no special short-circuit; generic PN suppressed)
c("Ano ang VAT?",         "TAGLISH",    mockGenericPN("Taglish"),   3);

// EXPLAIN with generic PN: DA + PE + LB = 3 (PN suppressed)
c("Explain VAT",          "EXPLAIN",    mockGenericPN("Explain"),   3, "generic-PN");
// EXPLAIN with specific PN: DA + PE + PN + LB = 4
c("Explain VAT",          "EXPLAIN",    mockSpecificPN("Explain"),  4, "specific-PN");

// PROCEDURAL with generic PN: DA + PE + LB = 3
c("How does VAT work?",   "PROCEDURAL", mockGenericPN("Proc"),      3, "generic-PN");
// PROCEDURAL with specific PN: DA + PE + PN + LB = 4
c("How does VAT work?",   "PROCEDURAL", mockSpecificPN("Proc"),     4, "specific-PN");

// COMPARATIVE: DA + PE + LB = 3 (PN always suppressed regardless of content; dedup bypass)
c("VAT vs percentage tax",                     "COMPARATIVE", mockComparative, 3);
c("difference between VAT and percentage tax", "COMPARATIVE", mockComparative, 3);
c("compare output VAT and input VAT",          "COMPARATIVE", mockComparative, 3);

// Backward compat: null responseStyle falls back to inline regex
c("What is VAT?",       null, mockGenericPN("BWC"),   2, "null->CONCISE fallback");
c("Explain VAT",        null, mockSpecificPN("BWC"),  4, "null->EXPLAIN fallback specific-PN");
c("How does VAT work?", null, mockSpecificPN("BWC"),  4, "null->PROCEDURAL fallback specific-PN");

// Fallback guard: missing sections → return structuredAnswer unchanged
const broken = "No headings here at all.";
const fout = renderFastDefinitionConversational(broken, "What is VAT?", "CONCISE");
const fallbackOk = fout === broken;
console.log(`${fallbackOk ? "✓" : "✗"} fallback    "missing sections" → structuredAnswer returned unchanged`);
if (fallbackOk) rp++; else rf++;

console.log(`\nrenderFastDefinitionConversational: ${rp} passed, ${rf} failed`);
console.log(`\n${"═".repeat(50)}`);
console.log(`TOTAL: ${dp + rp} passed, ${df + rf} failed`);
