import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";

const ROOT = "C:/Projects/tina-backend";
const OUT = path.join(ROOT, "evaluation/results/phase-10a14-r17-independent-review-1/logs");
const FINAL_RUNTIME = "345f2db5";
function git(args) { try { return execFileSync("git", args, { cwd: ROOT, encoding:"utf8", maxBuffer: 1024*1024*80 }).trimEnd(); } catch(e) { return (e.stdout?.toString()||"")+(e.stderr?.toString()||e.message); } }
function shaGit(pathspec, rev="HEAD") { try { return git(["rev-parse", `${rev}:${pathspec}`]); } catch { return null; } }
function summarize(text) { const lines=text.split(/\r?\n/); return { totals:[...text.matchAll(/(?:tests?|suites?|probes?)?\s*(?:passed|pass)[:= ]+(\d+).*?(?:failed|fail)[:= ]+(\d+)/ig)].map(m=>({pass:+m[1],fail:+m[2]})).slice(-10), nodeTestSummary: lines.filter(l=>/^# (tests|pass|fail|duration|suites)/i.test(l)).slice(-20), failures: lines.filter(l=>/not ok|AssertionError|ERR_|Error:|fail|✖|✗/i.test(l)).slice(0,120), streamPrematureClose:/ERR_STREAM_PREMATURE_CLOSE/.test(text), sevenZero:/7\s*\/\s*0|pass(?:ed)?\D+7\D+fail(?:ed)?\D+0/i.test(text), twentyFourZero:/24\s*\/\s*0|pass(?:ed)?\D+24\D+fail(?:ed)?\D+0/i.test(text) }; }
const [id, ...cmd] = process.argv.slice(2);
if (!id || cmd.length === 0) throw new Error("usage: node run-captured.mjs <id> <cmd...>");
const dir = path.join(OUT, id); fs.mkdirSync(dir, { recursive:true });
const before = { timestamp:new Date().toISOString(), head:git(["rev-parse","HEAD"]), branch:git(["branch","--show-current"]), statusShort:git(["status","--short"]), diffQuiet: spawnSync("git",["diff","--quiet","--"],{cwd:ROOT}).status===0, cachedDiffQuiet: spawnSync("git",["diff","--cached","--quiet","--"],{cwd:ROOT}).status===0, runtimeBlob: shaGit("services/philippine-tax-boundary-patterns.js"), runtimeBlobAt345f2db5: shaGit("services/philippine-tax-boundary-patterns.js", FINAL_RUNTIME) };
fs.writeFileSync(path.join(dir,"tree-before.txt"), before.statusShort + "\n");
fs.writeFileSync(path.join(dir,"before.json"), JSON.stringify(before,null,2)+"\n");
fs.writeFileSync(path.join(dir,"command.txt"), cmd.join(" ")+"\n");
const startedAt = new Date().toISOString();
const r = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding:"utf8", maxBuffer:1024*1024*200, shell:false, env:{...process.env} });
const endedAt = new Date().toISOString();
fs.writeFileSync(path.join(dir,"stdout.raw.txt"), r.stdout || "");
fs.writeFileSync(path.join(dir,"stderr.raw.txt"), r.stderr || "");
const after = { timestamp:new Date().toISOString(), head:git(["rev-parse","HEAD"]), statusShort:git(["status","--short"]), diffQuiet: spawnSync("git",["diff","--quiet","--"],{cwd:ROOT}).status===0, cachedDiffQuiet: spawnSync("git",["diff","--cached","--quiet","--"],{cwd:ROOT}).status===0, runtimeBlob: shaGit("services/philippine-tax-boundary-patterns.js"), runtimeBlobAt345f2db5: shaGit("services/philippine-tax-boundary-patterns.js", FINAL_RUNTIME) };
fs.writeFileSync(path.join(dir,"tree-after.txt"), after.statusShort + "\n");
const result = { id, command:cmd, startedAt, endedAt, status:r.status, signal:r.signal, error:r.error?.message??null, before, after, summary:summarize(`${r.stdout||""}\n${r.stderr||""}`) };
fs.writeFileSync(path.join(dir,"result.json"), JSON.stringify(result,null,2)+"\n");
const hashes=[]; for(const file of fs.readdirSync(dir).sort()){ const p=path.join(dir,file); if(fs.statSync(p).isFile()) hashes.push(`${crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}  ${file}`); }
fs.writeFileSync(path.join(dir,"hashes.sha256"), hashes.join("\n")+"\n");
console.log(JSON.stringify({id,status:r.status,signal:r.signal,error:r.error?.message??null,summary:result.summary},null,2));
process.exit(0);
