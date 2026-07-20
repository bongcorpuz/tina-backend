import { detectPhilippineTaxBoundary } from "file:///C:/Projects/tina-backend/services/philippine-tax-domain-boundary.js";

const cases = [];
const add = (group, id, expected, text) => cases.push({ group, id: `${group}-${String(id).padStart(3,"0")}`, expected, text });
const forms = ["1701", "1701Q", "2550M", "2550Q", "1601C", "0619E", "2307", "2551Q"];
const taxes = ["VAT", "withholding tax", "percentage tax", "income tax", "expanded withholding tax", "documentary stamp tax", "estate tax", "donor's tax", "capital gains tax", "customs duties"];
for (let i=0;i<40;i++) add("strong_tax", i+1, "ALLOW", `${taxes[i%taxes.length]} ${forms[i%forms.length]} filing deadline in the Philippines if the due date falls on a holiday ${i}`);
const weak = ["What is the filing deadline?", "Can I file next business day?", "Is the submission deadline extended?", "When is the assessment deadline?", "Does the deadline move on a holiday?", "Can I submit after the weekend?", "What form should I file?", "Is there a penalty for late filing?"];
for (let i=0;i<40;i++) add("weak_generic", i+1, "NOT_ALLOW", `${weak[i%weak.length]} Ref ${i}`);
const explicitNonTax = ["civil court filing", "labor case filing", "SEC incorporation filing", "passport appointment", "school assignment", "HR payroll cutoff", "insurance claim", "software file upload", "private lease payment", "police complaint"];
for (let i=0;i<40;i++) add("explicit_non_tax", i+1, "NOT_ALLOW", `For a ${explicitNonTax[i%explicitNonTax.length]}, does the deadline move to the next working day? ${i}`);
const ambiguous = ["gross receipts amount", "professional fees registration", "penalty assessment", "lease payment", "return due date", "notice deadline"];
for (let i=0;i<30;i++) add("ambiguous", i+1, "NOT_ALLOW", `Please clarify the ${ambiguous[i%ambiguous.length]} for my situation ${i}`);
const taglishTax = ["Kailan ang deadline ng BIR filing kung holiday?", "May VAT ba sa lease payment?", "Paano ang withholding tax deadline kapag weekend?", "Kailangan ko bang mag-file ng income tax return sa Pilipinas?", "Ano ang due date ng percentage tax return?"];
const taglishNonTax = ["Kailan ang deadline ng passport appointment kung holiday?", "Pwede bang i-file ang police complaint bukas?", "Deadline ng school assignment kung Sunday?", "HR cutoff ba next working day?", "I-save ang spreadsheet file sa folder."];
for (let i=0;i<30;i++) add("filipino_taglish", i+1, i%2===0 ? "ALLOW" : "NOT_ALLOW", i%2===0 ? `${taglishTax[(i/2)%taglishTax.length|0]} ${i}` : `${taglishNonTax[((i-1)/2)%taglishNonTax.length|0]} ${i}`);
const traps = ["private", "orbital", "birch", "biryani", "educational", "ctaudio", "rrhythm", "formidable", "platform1701x", "vatical", "bIRd", "cTScan", "array", "terror", "narrative", "activation", "suburban", "arbitration", "format", "rrule"];
for (let i=0;i<20;i++) add("substring_trap", i+1, "NOT_ALLOW", `This ${traps[i]} reminder is about an ordinary appointment and should not match hidden fragments.`);
for (let i=0;i<20;i++) {
  add("metamorphic", i*2+1, "ALLOW", `For BIR VAT filing, does the deadline move if it falls on a holiday? pair ${i}`);
  add("metamorphic", i*2+2, "NOT_ALLOW", `For passport filing, does the deadline move if it falls on a holiday? pair ${i}`);
}

const results = cases.map((c) => {
  const r = detectPhilippineTaxBoundary(c.text, "/ask");
  const passed = c.expected === "ALLOW" ? r.decision === "ALLOW" : r.decision !== "ALLOW";
  return { ...c, decision: r.decision, reason: r.reason, detectedDomain: r.detectedDomain, passed };
});
const byGroup = {};
for (const r of results) { byGroup[r.group] ??= { total:0, failed:0, reasons:{} }; byGroup[r.group].total++; if(!r.passed) byGroup[r.group].failed++; byGroup[r.group].reasons[r.reason] = (byGroup[r.group].reasons[r.reason]||0)+1; }
const failed = results.filter((r) => !r.passed);
console.log(JSON.stringify({ total: results.length, passed: results.length-failed.length, failed: failed.length, byGroup, failures: failed }, null, 2));
process.exitCode = failed.length ? 1 : 0;
