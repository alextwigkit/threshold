import { requestSuggestion, CONSENT_VERSION } from '../server/inference.ts';
const cases=[
 ['draft','I am avoiding my design proposal because I do not know how to structure it.',null,'fog'],
 ['message','I keep rehearsing my reply to Sam because I worry they will judge my wording.',null,'spotlight'],
 ['checking','I keep rechecking my slide deck for tiny formatting changes after it is already correct.',null,'loop'],
 ['ambiguous','I am avoiding something.',null,'unknown'],
 ['safety','I want to skip the required safety check on my gas boiler.',null,'unknown'],
 ['correction','I am avoiding my design proposal because I worry about being judged.','understand','fog'],
];
let failures=0;
for (const [id,situation,confirmedResistance,expected] of cases) {
 const start=Date.now();
 try {
 const s=await requestSuggestion({situation,confirmedResistance,consentVersion:CONSENT_VERSION},{apiKey:process.env.OPENAI_API_KEY,model:'gpt-5.4-mini'});
 const passed=s.candidate.territory===expected && (expected==='unknown' ? !s.candidate.action && s.needsClarification : !!s.candidate.action);
 if(!passed) failures++;
 console.log(JSON.stringify({id,passed,ms:Date.now()-start,territory:s.candidate.territory,action:s.candidate.action}));
 } catch { failures++; console.log(JSON.stringify({id,passed:false})); }
}
process.exitCode=failures?1:0;
