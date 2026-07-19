import fs from "node:fs"; import path from "node:path"; import jwt from "jsonwebtoken";
const ROOT=process.cwd();
for (const line of fs.readFileSync(path.join(ROOT,".env"),"utf8").split(/\r?\n/)){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}
const ASK=process.env.TINA_STAGING_ASK_URL,BASE=ASK.replace(/(https?:\/\/[^/]+).*/,"$1"),USER="00000000-0000-4000-8000-0000000e1001";
const tok=jwt.sign({id:USER,username:"e1-eval-synthetic",role:"user",otpVerified:true,adaptiveEnabled:true,orchestrationCompatible:true,activeMode:"STANDARD_TAX_MODE",activeHook:"/ask"},process.env.JWT_SECRET,{expiresIn:"2h"});
const H={"Content-Type":"application/json",Authorization:`Bearer ${tok}`};
const CASES=[["filing_obligation_valid","Under Section 51 of the NIRC, is a self-employed individual required to file an annual income tax return?"],["q12_corrected","Is an individual with P250,000 gross compensation income in 2024 required to file an income tax return?"],["calendar_relative_corrected","Is today the last day to file the annual income tax return of an individual?"],["substituted_valid","What are the conditions for substituted filing of the income tax return under Section 51-A?"]];
const jp=async(u,b)=>{const r=await fetch(u,{method:"POST",headers:H,body:JSON.stringify(b)});return r.json().catch(()=>null);};
const jg=async(u)=>{const r=await fetch(u,{headers:H});return r.json().catch(()=>null);};
const rows=[];
for(const [cls,q] of CASES){const conv=await jp(`${BASE}/conversations`,{title:`r9-ws12-${cls}`});const cid=conv?.id||conv?.conversationId||conv?.conversation?.id;const ask=await jp(ASK,{question:q,userId:USER,conversationId:cid,forcedHook:"/ask"});const immT=ask?.trust?.authoritySupport??null,immS=ask?.trust?.sourceState??ask?.sourceStatus??null;await new Promise(r=>setTimeout(r,1500));const msgs=await jg(`${BASE}/conversations/${cid}/messages`);const arr=Array.isArray(msgs)?msgs:(msgs?.messages||msgs?.data||[]);const last=arr.filter(m=>(m.role||m.sender)!=="user").pop()||{};const perT=last?.trust?.authoritySupport??null,perS=last?.trust?.sourceState??null;const consistent=immT===perT;rows.push({cls,immT,perT,immS,perS,consistent});console.log(`${cls}: imm=${immT} per=${perT} consistent=${consistent}`);}
fs.writeFileSync("evaluation/results/phase-10a14-r9/WS12_PERSISTENCE_R9.json",JSON.stringify({cases:rows.length,mismatches:rows.filter(r=>!r.consistent).length,rows},null,2));
console.log("WS12 mismatches:",rows.filter(r=>!r.consistent).length);
