import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { detectPhilippineTaxBoundary } from "../../../services/philippine-tax-domain-boundary.js";
import { validateSha, validateAttemptProvenance, detectCorruption, scanAttemptCorruption, readAdjudication, resolveDisposition, validateRetryLinks } from "../phase-10a14-r17/validators.mjs";

const ROOT = "C:/Projects/tina-backend";
const OUT = "evaluation/results/phase-10a14-r17-independent-review-1";
const OUT_ABS = path.join(ROOT, OUT);
const R17 = "evaluation/results/phase-10a14-r17";
const PREDECESSOR = "0f2468bc4ac657eee4c8c1ee94ab3a0b9f0cc690";
const FINAL_RUNTIME = "345f2db5";
const FINAL_HEAD = "c358b399a4b64402148f37bd6bd87fe47997c5c1";
const EXPECTED_BRANCH = "feature/source-availability-engine-v1";

function ensureDir(p) { fs.mkdirSync(path.join(OUT_ABS, p), { recursive: true }); }
function writeJson(name, data) { fs.writeFileSync(path.join(OUT_ABS, name), JSON.stringify(data, null, 2) + "\n"); }
function writeText(name, data) { fs.writeFileSync(path.join(OUT_ABS, name), data.endsWith("\n") ? data : data + "\n"); }
function git(args, opts = {}) {
  try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1024 * 1024 * 80, ...opts }).trimEnd(); }
  catch (e) { return { error: e.message, status: e.status, stdout: e.stdout?.toString(), stderr: e.stderr?.toString() }; }
}
function run(cmd, args, opts = {}) {
  const startedAt = new Date().toISOString();
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1024 * 1024 * 120, shell: false, ...opts });
  return { command: [cmd, ...args].join(" "), startedAt, endedAt: new Date().toISOString(), status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
function shaFile(p) { return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex"); }
function listFiles(dir) {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) return [];
  const out = [];
  const walk = (d) => { for (const ent of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, ent.name); if (ent.isDirectory()) walk(p); else out.push(path.relative(ROOT, p).replace(/\\/g, "/")); } };
  walk(base); return out.sort();
}
function maybeJson(file) { try { return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8")); } catch { return null; } }
function terminalStatus(dir) {
  const names = fs.readdirSync(path.join(ROOT, dir));
  const terminal = names.find(n => /^20-completed-pass\.json$/i.test(n)) ? "COMPLETED_PASS" : names.find(n => /^20-completed-fail\.json$/i.test(n)) ? "COMPLETED_FAIL" : names.find(n => /^20-technical-fail\.json$/i.test(n)) ? "TECHNICAL_FAIL" : names.find(n => /^20-environment-fail\.json$/i.test(n)) ? "ENVIRONMENT_FAIL" : names.find(n => /^20-/.test(n)) ?? null;
  return terminal;
}
function readAttempt(dir) {
  const full = path.join(ROOT, dir);
  const id = path.basename(dir);
  const alloc = maybeJson(path.join(dir, "00-allocated.json")) ?? {};
  const started = maybeJson(path.join(dir, "10-started.json")) ?? {};
  const pass = maybeJson(path.join(dir, "20-completed-pass.json"));
  const fail = maybeJson(path.join(dir, "20-completed-fail.json"));
  const term = pass ?? fail ?? {};
  const retry = maybeJson(path.join(dir, "30-retry-of.json"));
  const env = maybeJson(path.join(dir, "environment.json")) ?? {};
  const cmd = fs.existsSync(path.join(full, "command.txt")) ? fs.readFileSync(path.join(full, "command.txt"), "utf8").trim() : null;
  const rawStatus = terminalStatus(dir);
  const rec = {
    attemptId: id,
    dir,
    command: cmd,
    objective: alloc.objective ?? alloc.gate ?? alloc.suite ?? env.objective ?? null,
    rawStatus,
    exitCode: term.exitCode ?? term.status ?? null,
    signal: term.signal ?? null,
    retryOf: retry?.retryOf ?? alloc.retryOf ?? null,
    retryReason: retry?.retryReason ?? retry?.reason ?? null,
    runtimeCommit: alloc.runtimeCommit ?? started.runtimeCommit ?? env.runtimeCommit ?? term.runtimeCommit ?? null,
    headAtStart: alloc.headAtStart ?? started.headAtStart ?? env.headAtStart ?? null,
    headAtEnd: term.headAtEnd ?? env.headAtEnd ?? null,
    treeBeforeHash: fs.existsSync(path.join(full, "tree-before.txt")) ? shaFile(path.join(dir, "tree-before.txt")) : null,
    treeAfterHash: fs.existsSync(path.join(full, "tree-after.txt")) ? shaFile(path.join(dir, "tree-after.txt")) : null,
    stdoutHash: fs.existsSync(path.join(full, "stdout.raw.txt")) ? shaFile(path.join(dir, "stdout.raw.txt")) : null,
    stderrHash: fs.existsSync(path.join(full, "stderr.raw.txt")) ? shaFile(path.join(dir, "stderr.raw.txt")) : null,
  };
  const prov = validateAttemptProvenance(rec, { expectedAncestorOf: FINAL_HEAD, cwd: ROOT });
  const corrupt = scanAttemptCorruption(full);
  const disp = resolveDisposition({ dir: full, rawStatus, provenanceValid: prov.provenanceValid, corruption: corrupt });
  return { ...rec, ...prov, corruption: corrupt, disposition: disp.disposition, controlling: disp.controlling, dispositionReasons: disp.reasons };
}
function summarizeOutput(stdout, stderr) {
  const text = `${stdout}\n${stderr}`;
  const lines = text.split(/\r?\n/);
  return {
    syntaxMatch: text.match(/Syntax:\s*(\d+)\/(\d+)/i)?.slice(1) ?? null,
    totals: [...text.matchAll(/(?:passed|pass)[:= ]+(\d+).*?(?:failed|fail)[:= ]+(\d+)/ig)].map(m => ({ pass: Number(m[1]), fail: Number(m[2]) })).slice(-5),
    failureLines: lines.filter(l => /fail|error|ERR_|AssertionError|not ok|✖|✗/i.test(l)).slice(0, 80),
    streamPrematureClose: /ERR_STREAM_PREMATURE_CLOSE/.test(text),
  };
}

ensureDir(""); ensureDir("logs"); ensureDir("adversarial-fixtures");
const preflight = {
  generatedAt: new Date().toISOString(),
  repo: git(["rev-parse", "--show-toplevel"]),
  branch: git(["branch", "--show-current"]),
  head: git(["rev-parse", "HEAD"]),
  sync: git(["rev-list", "--left-right", "--count", "HEAD...@{u}"]),
  statusShort: git(["status", "--short"]),
  trackedClean: git(["diff", "--quiet", "--"] ) === "" && git(["diff", "--cached", "--quiet", "--"]) === "",
  finalRuntimeAncestor: run("git", ["merge-base", "--is-ancestor", FINAL_RUNTIME, "HEAD"]).status === 0,
  predecessorAncestor: run("git", ["merge-base", "--is-ancestor", PREDECESSOR, "HEAD"]).status === 0,
  nodeVersion: run("node", ["--version"]).stdout.trim(),
  port5173: run("powershell", ["-NoProfile", "-Command", "Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue | ConvertTo-Json -Compress"]).stdout.trim(),
  nodeListeners: run("powershell", ["-NoProfile", "-Command", "Get-Process node -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path | ConvertTo-Json -Compress"]).stdout.trim(),
  protectedUntracked: git(["status", "--short", "--", ".claude", ".vscode", "evaluation/factcheck"]),
  expected: { branch: EXPECTED_BRANCH, head: FINAL_HEAD, sync: "0\t0" }
};
writeJson("01_REPOSITORY_PREFLIGHT.json", preflight);
writeText("01_REPOSITORY_PREFLIGHT.md", `# Repository Preflight\n\n- repo: ${preflight.repo}\n- branch: ${preflight.branch}\n- HEAD: ${preflight.head}\n- sync: ${preflight.sync}\n- final runtime ancestor: ${preflight.finalRuntimeAncestor}\n- predecessor ancestor: ${preflight.predecessorAncestor}\n- tracked clean: ${preflight.trackedClean}\n- protected untracked: ${preflight.protectedUntracked || "none"}\n- port 5173 listeners: ${preflight.port5173 || "none"}\n- node processes: ${preflight.nodeListeners || "none"}\n`);

const commits = git(["log", "--reverse", "--format=%H%x09%ct%x09%s", `${PREDECESSOR}..${FINAL_HEAD}`]).split(/\r?\n/).filter(Boolean).map(line => { const [sha, ts, ...msg] = line.split("\t"); return { sha, date: new Date(Number(ts)*1000).toISOString(), subject: msg.join("\t"), files: git(["diff-tree", "--no-commit-id", "--name-only", "-r", sha]).split(/\r?\n/).filter(Boolean) }; });
writeJson("02_COMMIT_CHRONOLOGY.json", commits);
writeText("02_COMMIT_CHRONOLOGY.md", `# Commit Chronology\n\n${commits.map((c,i)=>`${i+1}. ${c.sha} ${c.date} - ${c.subject}\n   Files: ${c.files.join(", ") || "none"}`).join("\n")}\n`);

const runtimeChanged = git(["diff", "--name-only", PREDECESSOR, FINAL_RUNTIME]).split(/\r?\n/).filter(Boolean).filter(f => !f.startsWith("evaluation/") && !f.startsWith("knowledge/") && !f.startsWith(".claude/") && !f.startsWith(".vscode/"));
const runtimeEquiv = runtimeChanged.map(file => {
  const blobRuntime = git(["rev-parse", `${FINAL_RUNTIME}:${file}`]);
  const blobHead = git(["rev-parse", `${FINAL_HEAD}:${file}`]);
  const laterTouches = git(["log", "--format=%H", `${FINAL_RUNTIME}..${FINAL_HEAD}`, "--", file]).split(/\r?\n/).filter(Boolean);
  return { file, blobAtFinalRuntime: blobRuntime, blobAtFinalHead: blobHead, equal: blobRuntime === blobHead, laterTouches };
});
writeJson("03_RUNTIME_BYTE_EQUIVALENCE.json", { runtimeChanged, runtimeEquiv, complete: runtimeEquiv.every(r => r.equal && r.laterTouches.length === 0) });

const inv = maybeJson(`${R17}/R17_DOMAIN_PROBE_INVENTORY.json`);
const frozenResults = [];
let falseAllow = 0, falseRefusal = 0;
const classCounts = {};
for (const p of inv.probes) {
  const r = detectPhilippineTaxBoundary(p.text, "/ask");
  const got = r.decision === "ALLOW" ? "ALLOW" : "NOT_ALLOW";
  const ok = p.expected === "CLARIFY_OR_NOT_ALLOW" ? got === "NOT_ALLOW" : got === p.expected;
  const c = classCounts[p.coverageClass] ||= { total:0, pass:0, falseAllow:0, falseRefusal:0 };
  c.total++; if (ok) c.pass++; else if (p.expected === "ALLOW") { falseRefusal++; c.falseRefusal++; } else { falseAllow++; c.falseAllow++; }
  frozenResults.push({ probeId:p.probeId, coverageClass:p.coverageClass, expected:p.expected, got, ok, reason:r.reason, text:p.text });
}
writeJson("04_FROZEN_DOMAIN_INVENTORY_REVIEW.json", { total: inv.probes.length, classCounts, falseAllow, falseRefusal, failures: frozenResults.filter(r=>!r.ok), requiredExact: ["What customs duties apply to importing goods into the Philippines?", "What is the BOC customs duty deadline for imported goods?", "What are Philippine customs duties?", "What is the holding-period rule for an individual's capital gain on personal property?"].map(text => ({ text, result: detectPhilippineTaxBoundary(text,"/ask") })) });

const oracle = [];
let n = 1;
function add(group, expected, texts) { for (const text of texts) oracle.push({ id: `IR17-${String(n++).padStart(3,"0")}`, group, expected, text }); }
const customsTax = ["What customs duties apply when importing medical equipment into the Philippines?","Explain tariff classification for imported apparel under Philippine customs rules.","Is import duty payable on goods released by the BOC?","How does BOC assess customs duties on imported machinery?","What Philippine tax rules govern customs valuation for imports?","Can a customs broker ask the BOC about tariff classification before entry?","What are the VAT and customs duty consequences of importing rice?","When is customs duty due for an import shipment?","How are excise tax and customs duty handled on imported alcohol?","Does the Tariff and Customs Code affect Philippine import duty?","What is the BOC rule for duty drawback?","How do I dispute a customs duty assessment?","Are imported books subject to customs duties?","What happens if the BOC finds undervaluation for import duty?","How do customs duties interact with VAT on importation?","What is the tax treatment of demurrage in customs valuation?","Can tariff classification change the import duty rate?","What customs duty applies to imported spare parts?","How does BOC compute landed cost for tax purposes?","Are customs duties deductible for Philippine income tax?","What records support an import duty protest?","Does BOC impose penalties for unpaid customs duties?","What are customs tax obligations for temporary importation?","How is import duty assessed for e-commerce shipments?","Can a PEZA importer get customs duty exemptions?","What is the tax effect of post-entry customs audit?","How are customs duties paid before goods release?","Does BOC classify HS codes for tariff tax rates?","What is the customs duty base for related-party imports?","Are import duties taxes under Philippine law?"];
const capGainTax = ["Is a gain on sale of a capital asset taxable in the Philippines?","How is capital gain tax computed on sale of real property?","What holding period affects capital gain treatment for personal property?","Is capital gain on shares of stock taxable?","What is the tax rate for sale of a capital asset by an individual?","Does the holding period change recognized capital gain?","How does Philippine tax law define capital asset?","Is a loss from sale of capital asset deductible?","What BIR return is used for capital gains tax on real property?","When is capital gains tax due after selling land?","Is gain from selling inherited property taxable?","How does ordinary asset status affect capital gain tax?","What tax applies to sale of unlisted shares?","Can capital gains tax apply even if sale proceeds are unpaid?","Is capital gain on condominium sale taxable?","What documents support capital gains tax filing?","How does zonal value affect capital gains tax?","Is a foreigner's sale of Philippine real property taxable?","What is the taxability of a gain from selling a capital asset?","Does a holding period rule apply to capital gains on personal property?","Can a corporation have capital gain tax on shares?","What is the capital gains tax deadline for real property sale?","Is gain taxable if the asset was held more than one year?","How does BIR assess capital gains tax deficiencies?","What exemptions apply to capital gains tax on principal residence?","Is capital gain subject to withholding tax?","What is taxable gain for sale of capital asset?","How are capital losses carried over under Philippine tax rules?","Does donor's tax replace capital gains tax on sale?","What is the tax base for capital gains tax?"];
const bir = ["What is Oplan Kandado under BIR enforcement?","Can the BIR issue a VAT closure order under Oplan Kandado?","What due process is required before BIR closure of a business?","How does BIR enforce failure to issue receipts?","What happens after a BIR tax assessment notice?","Can BIR close a store for VAT violations?","How do I respond to a BIR preliminary assessment notice?","What is the tax effect of a final assessment notice?","Does Oplan Kandado apply to non-VAT taxpayers?","Can BIR inspect books during enforcement?","What penalties apply for BIR tax evasion findings?","How does BIR serve a notice of informal conference?","What is the deadline to protest a BIR assessment?","Can BIR garnish bank accounts for unpaid tax?","How does BIR compromise a tax assessment?","What is the taxability issue in a BIR LOA audit?","Can a taxpayer contest a BIR closure order?","What is a BIR mission order in tax enforcement?","When can BIR suspend business operations?","What return must be amended after BIR findings?"];
const privateContract = ["When is rent due under a private lease contract?","Can my landlord terminate the lease for late payment?","What notice is required to end a private lease?","How do I enforce a private supply agreement?","Can a contract deadline be extended by email?","What is the remedy for breach of a service contract?","Does a private lease require notarization?","Can I assign my lease to another tenant?","What happens if a contractor misses a due date?","How do liquidated damages work in a lease?","Can a tenant withhold rent for repairs?","What court handles a private collection case?","How do I draft a notice of default?","Is a non-compete clause enforceable?","Can a buyer cancel a private sale agreement?","Who pays insurance under a lease?","What is the deadline to return a security deposit?","Can a school filing deadline be moved by contract?","How do I make an insurance claim under my policy?","Can a private contract require passport submission?","What happens if a computer file is delivered late?","Can a supplier reject a return of goods?","What notice period applies to a consulting agreement?","Does a late assessment of damages breach the contract?","Can a private lease include a taxable costs clause?","Who is liable for property maintenance under a lease?","What if a payment due date falls on a weekend?","Can an employer recover training costs by contract?","How do I terminate a gym membership contract?","Can a settlement agreement waive future claims?"];
const courtLaborSec = ["What is the civil court deadline to file an answer?","How many days to appeal a civil court judgment?","What is the labor filing deadline for illegal dismissal?","Can an employee file a labor case after resignation?","What is the SEC report deadline for a corporation?","How do I file a GIS report with the SEC?","What notice must an employer give before termination?","Can a civil court issue a temporary restraining order?","What is the deadline to file a motion for reconsideration?","How does DOLE handle a labor standards complaint?","What happens if an SEC report is late?","Can a corporation amend its articles with the SEC?","What filing is required for a civil complaint?","Can a labor arbiter order reinstatement?","What is the venue for a civil court case?","How do I respond to an SEC show cause order?","What is the prescriptive period for money claims in labor?","Can a school filing be challenged in court?","What notice starts the civil court deadline?","Is a passport needed for court notarization?","How do I file an insurance claim lawsuit?","What return date appears in a summons?","Can an assessment of damages be appealed?","What report must a corporation file after board changes?","Can an employee claim unpaid wages?","What is the due date for a position paper?","How do subpoenas work in civil court?","Can the SEC revoke a corporation?","What is the deadline for a labor appeal bond?","How does small claims court handle contracts?"];
const generic = ["When is the deadline?","Is the assessment valid?","Can I file a return?","Is it taxable?","What notice do I need?","What is the due date?","Can I appeal the assessment?","Do I need to submit a report?","What is the filing requirement?","Can the return be corrected?","What happens if I miss the deadline?","Is the gain taxable?","What documents are required?","Can the office close my case?","What rate applies?","Is there an exemption?","Can I ask for reconsideration?","Who should receive the notice?","How is the amount computed?","What is the penalty?","Can I file online?","When does the period start?","What is the basis?","Can it be deducted?","Is payment required?","What form should I use?","What rule applies?","Can I request extension?","How is the assessment served?","What is the taxability?"];
const taglish = ["May customs duty ba sa imported goods sa Pilipinas?","Kailan due ang capital gains tax pag nagbenta ng lupa?","Pwede bang isara ng BIR under Oplan Kandado ang tindahan?","Ano ang BOC tariff classification ng imported shoes?","Taxable ba ang gain sa sale of capital asset?","May VAT ba sa importation?","Paano mag-protest ng BIR assessment notice?","Ano ang holding period rule sa capital gain?","May import duty ba sa parcel from abroad?","Paano bayaran ang customs duties sa BOC?","Kailan ang due date ng private lease rent?","Paano mag-file ng labor complaint?","Ano deadline sa civil court answer?","Kailangan ba passport sa school filing?","Paano mag-submit ng SEC report?","Pwede bang mag-return ng defective computer file?","Ano notice period sa lease termination?","Paano ang insurance claim?","Taxable ba ito?","May assessment ba sa school fees?"];
const traps = ["How do I file a computer taxonomies document?","Can I return a defective taxicab part?","What is the deadline for a syntax assessment?","Does a taxidermy shop need a school permit?","How do I classify a tariff guitar chord?","Can a passport office assess my photo?","What is the taxable font in a CSS file?","How do I import a computer file into Excel?","Can I gain access to a capital city database?","What is a notice in a private messaging app?","How do I return to the assessment page?","Is the BOC a band of chords?","What is an import statement in JavaScript?","How do I close a VAT color palette?","Can labor day filing be rescheduled by school?","What is a SEC in time measurement?","How to assess a school project?","When is a private lease car returned?","What is a due date in project management?","Can insurance claim files be uploaded?"];
add("customs_tariff_tax", "ALLOW", customsTax); add("capital_gain_tax", "ALLOW", capGainTax); add("bir_enforcement_tax", "ALLOW", bir); add("private_contract_non_tax", "NOT_ALLOW", privateContract); add("court_labor_sec_non_tax", "NOT_ALLOW", courtLaborSec); add("generic_ambiguous", "NOT_ALLOW", generic); add("filipino_taglish_mixed", "MIXED", taglish); add("substring_traps", "NOT_ALLOW", traps);
const campaign = oracle.map(p => { const r = detectPhilippineTaxBoundary(p.text, "/ask"); const got = r.decision === "ALLOW" ? "ALLOW" : "NOT_ALLOW"; const expected = p.expected === "MIXED" ? (/customs|duty|capital gains|BIR|Oplan|BOC|VAT|importation|assessment/i.test(p.text) ? "ALLOW" : "NOT_ALLOW") : p.expected; return { ...p, expected, got, ok: got === expected, reason: r.reason }; });
const campaignSummary = { total: campaign.length, pass: campaign.filter(p=>p.ok).length, fail: campaign.filter(p=>!p.ok).length, byGroup: {}, materialFalseAllows: campaign.filter(p=>!p.ok && p.expected!=="ALLOW"), materialFalseRefusals: campaign.filter(p=>!p.ok && p.expected==="ALLOW") };
for (const p of campaign) { const g = campaignSummary.byGroup[p.group] ||= { total:0, pass:0, fail:0 }; g.total++; if(p.ok) g.pass++; else g.fail++; }
writeJson("05_INDEPENDENT_DOMAIN_ORACLE.json", oracle);
writeJson("06_INDEPENDENT_DOMAIN_CAMPAIGN.json", { summary: campaignSummary, results: campaign });
const mm = detectPhilippineTaxBoundary("Is the gain taxable?", "/ask");
writeJson("07_MM_15_WEAK_ADJUDICATION.json", { text: "Is the gain taxable?", detector: mm, adjudication: { taxableIsTaxSignal: true, allowCorrectWithinDeclaredPhilippineTaxScope: true, frozenExpectationDefective: true, validWeakSignalMetamorphicControl: false, affectsOtherRows: frozenResults.filter(r => /taxable|taxability/i.test(r.text)), classification: "R17-FIXTURE-001 accepted as frozen oracle/inventory-authoring defect; governance-blocking only as a fixture defect if the frozen contract requires perfect oracle truth, not a runtime false allow." } });

const attemptsDir = `${R17}/attempts`;
const attemptDirs = fs.readdirSync(path.join(ROOT, attemptsDir), { withFileTypes:true }).filter(d=>d.isDirectory()).map(d => `${attemptsDir}/${d.name}`).sort();
const rawRegistry = attemptDirs.map(readAttempt);
const retry = validateRetryLinks(rawRegistry);
const count = { totalAttempts: rawRegistry.length, runnerInvocations: rawRegistry.filter(r=>/run-regressions\.mjs/.test(r.command||"")).length, stagingRunnerInvocations: rawRegistry.filter(r=>/run-staging-smokes\.mjs/.test(r.command||"")).length, focusedSuiteInvocations: rawRegistry.filter(r=>/node tests\//.test((r.command||"").replace(/\\/g,"/"))).length, campaignAttempts: rawRegistry.filter(r=>/campaign/i.test(r.objective||r.attemptId)).length, completedPass: rawRegistry.filter(r=>r.rawStatus==="COMPLETED_PASS").length, completedFailures: rawRegistry.filter(r=>r.rawStatus==="COMPLETED_FAIL").length, technicalFailures: rawRegistry.filter(r=>r.rawStatus==="TECHNICAL_FAIL").length, environmentFailures: rawRegistry.filter(r=>r.rawStatus==="ENVIRONMENT_FAIL").length, incompleteAttempts: rawRegistry.filter(r=>!r.rawStatus).length, corruptAttempts: rawRegistry.filter(r=>r.corruption.corrupt).length, invalidProvenanceAttempts: rawRegistry.filter(r=>!r.provenanceValid).length, controllingAttempts: rawRegistry.filter(r=>r.controlling && r.provenanceValid).length, nonControllingAttempts: rawRegistry.filter(r=>!(r.controlling && r.provenanceValid)).length, validLinkedRetries: retry.validRetries.length, unlinkedReruns: 0 };
const seenKeys = new Map();
for (const r of rawRegistry) { const key = `${r.command}|${r.runtimeCommit}`; count.unlinkedReruns += seenKeys.has(key) && r.retryOf == null ? 1 : 0; seenKeys.set(key,true); }
writeJson("08_INDEPENDENT_REGISTRY_REGENERATION.json", { counts: count, retry, records: rawRegistry });
const canonical = maybeJson(`${R17}/CANONICAL_COUNT_SUMMARY.json`);
writeJson("09_COUNT_RECONCILIATION.json", { independent: count, canonical: canonical?.counts, mismatches: Object.keys(count).filter(k => canonical?.counts?.[k] !== count[k]).map(k => ({ field:k, independent:count[k], canonical:canonical?.counts?.[k] })) });

const manifestPath = path.join(ROOT, R17, "EVIDENCE_MANIFEST.sha256");
const manifestLines = fs.readFileSync(manifestPath, "utf8").trim().split(/\r?\n/).filter(Boolean);
const manifestRows = manifestLines.map(line => { const m = line.match(/^([a-f0-9]{64})\s\s(.+)$/); return { hash:m?.[1], file:m?.[2] ?? line }; });
const dup = manifestRows.map(r=>r.file).filter((v,i,a)=>a.indexOf(v)!==i);
const mismatches = [];
for (const row of manifestRows) { const p = path.join(ROOT, row.file); if (!fs.existsSync(p)) mismatches.push({ file:row.file, issue:"missing" }); else { const h = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); if (h !== row.hash) mismatches.push({ file:row.file, issue:"hash", expected:row.hash, got:h }); } }
writeJson("10_MANIFEST_AUDIT.json", { entries: manifestRows.length, selfExcluded: !manifestRows.some(r=>/EVIDENCE_MANIFEST\.sha256$/.test(r.file)), duplicatePaths: dup, mismatches, attemptDirsIncluded: attemptDirs.every(d => manifestRows.some(r=>r.file.startsWith(d))) });

const resultJson = maybeJson("evaluation/results/phase-10a14-r17-result.json");
const currentState = fs.readFileSync(path.join(ROOT, "knowledge/CURRENT_STATE.md"), "utf8");
writeJson("11_CURRENT_STATE_AND_SCOPE_REVIEW.json", { resultDecision: resultJson?.decision, currentStateHas: { finalRuntime: currentState.includes("345f2db5"), finalHead: currentState.includes(FINAL_HEAD), revisionsRequired: /REVISIONS REQUIRED/.test(currentState), phase10AOpen: /Phase 10A.*OPEN|Phase 10A remains OPEN/i.test(currentState), retryOpen: /P1-R16-IR-005|retry/i.test(currentState), deterministic0of2: /0\/2/.test(currentState), staging2of2: /2\/2|two R17 staging cycles/i.test(currentState) }, scopeSearches: { productionDeploy: git(["log", "--format=%H %s", `${PREDECESSOR}..${FINAL_HEAD}`, "--", ".github", "scripts", "server.js"]).includes("deploy") } });

const gitObjectValidation = {
  valid40Commit: validateSha(FINAL_HEAD, { expectedAncestorOf: FINAL_HEAD, cwd: ROOT }),
  shortSha: validateSha("c358b399", { expectedAncestorOf: FINAL_HEAD, cwd: ROOT }),
  nonHex: validateSha("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz", { expectedAncestorOf: FINAL_HEAD, cwd: ROOT }),
  nonexistent40: validateSha("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", { expectedAncestorOf: FINAL_HEAD, cwd: ROOT }),
  blobSha: null,
  treeSha: null,
  validCommitNotAncestor: null,
  validCommitAncestor: validateSha(PREDECESSOR, { expectedAncestorOf: FINAL_HEAD, cwd: ROOT }),
  callerDisagreesWithHead: { supplied: FINAL_RUNTIME, gitHead: preflight.head, acceptedAsHead: FINAL_RUNTIME === preflight.head }
};
const anyFile = runtimeChanged[0] || "package.json";
gitObjectValidation.blobSha = validateSha(git(["rev-parse", `${FINAL_HEAD}:${anyFile}`]), { expectedAncestorOf: FINAL_HEAD, cwd: ROOT });
gitObjectValidation.treeSha = validateSha(git(["rev-parse", `${FINAL_HEAD}^{tree}`]), { expectedAncestorOf: FINAL_HEAD, cwd: ROOT });
writeJson("12_GIT_OBJECT_VALIDATION_RESULTS.json", gitObjectValidation);

const tmp = path.join(OUT_ABS, "adversarial-fixtures");
fs.writeFileSync(path.join(tmp,"empty.raw.txt"), "");
fs.writeFileSync(path.join(tmp,"whitespace-tree-before.txt"), "   \r\n");
fs.writeFileSync(path.join(tmp,"nul.txt"), Buffer.from([65,0,66]));
fs.writeFileSync(path.join(tmp,"malformed.json"), "{ nope");
fs.writeFileSync(path.join(tmp,"whitespace.json"), "   \n");
fs.writeFileSync(path.join(tmp,"valid.json"), "{}\n");
const recoveryCases = ["empty.raw.txt","whitespace-tree-before.txt","nul.txt","malformed.json","whitespace.json","valid.json"].map(f => ({ file:f, result: detectCorruption(path.join(tmp,f)) }));
writeJson("13_RECOVERY_CORRUPTION_ADVERSARIAL_TESTS.json", { cases: recoveryCases, r16HistoricalScan: scanAttemptCorruption(path.join(ROOT,"evaluation/results/phase-10a14-r16/attempts/R16-GATE-det-cycle1-A1")) });

const detAttempts = rawRegistry.filter(r=>/^R17-GATE-det/.test(r.attemptId)).map(r => { const stdout = fs.readFileSync(path.join(ROOT, r.dir, "stdout.raw.txt"), "utf8"); const stderr = fs.readFileSync(path.join(ROOT, r.dir, "stderr.raw.txt"), "utf8"); return { ...r, outputSummary: summarizeOutput(stdout, stderr), suiteMarkers: ["patch-027u","phase-10a10-r1","phase-10a10-r2","phase-10a12","phase-10a8"].map(marker => ({ marker, present: stdout.includes(marker) || stderr.includes(marker), directStreamErrorNearby: new RegExp(`${marker}[\\s\\S]{0,3000}ERR_STREAM_PREMATURE_CLOSE|ERR_STREAM_PREMATURE_CLOSE[\\s\\S]{0,3000}${marker}`).test(stdout+stderr) })) }; });
writeJson("14_A1_A2_A3_ERROR_ANALYSIS.json", detAttempts);

const e1Path = "evaluation/results/phase-10a14-e1/WS8_DETERMINISTIC_ALL26.json";
const e1Hash = fs.existsSync(path.join(ROOT,e1Path)) ? shaFile(e1Path) : null;
writeJson("15_PROTECTED_E1_INCIDENT_REVIEW.json", { path:e1Path, finalHash:e1Hash, commitsTouchingE1InR17: git(["log", "--format=%H %s", `${PREDECESSOR}..${FINAL_HEAD}`, "--", e1Path]).split(/\r?\n/).filter(Boolean), nonmutatingReplayAttempts: rawRegistry.filter(r=>/all26-nonmutating/i.test(r.attemptId)).map(r=>({ attemptId:r.attemptId, rawStatus:r.rawStatus, controlling:r.controlling, command:r.command })) });

writeText("00_FROZEN_INDEPENDENT_REVIEW_PLAN.md", `# Frozen Independent Review Plan\n\nReviewer: Codex 5.5. Scope: evidence-only independent review of R17 at ${FINAL_HEAD}. No runtime remediation, no historical evidence rewriting, no Dev Factory modification.\n\nSteps: preflight; chronology; runtime byte-equivalence; frozen and unseen domain probes; validator adversarial cases; registry regeneration; gate execution; focused-suite execution; manifest, CURRENT_STATE, scope review; adjudication; report/result/manifest; commit and push.\n`);
writeText("00_AGENT_ASSIGNMENT_RECORD.md", `# Agent Assignment Record\n\nPrimary independent reviewer: Codex 5.5. R17 executor Opus 4.8 is disqualified. No alternate reviewer or challenge reviewer was used in this run.\n`);
console.log("static review artifacts written to", OUT_ABS);
