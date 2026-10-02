import fs from 'fs';

// 1. Patch archived_site/assets/js/index-DSllDNEm.js
let dsCode = fs.readFileSync('archived_site/assets/js/index-DSllDNEm.js', 'utf8');

// Patch jee: async function jee(e){...}
const jeeIdx = dsCode.indexOf('async function jee(e){');
if (jeeIdx !== -1) {
  const jeeEnd = dsCode.indexOf('}', dsCode.indexOf('logoutLocal', jeeIdx));
  const origJee = dsCode.substring(jeeIdx, jeeEnd + 1);
  dsCode = dsCode.replace(origJee, 'async function jee(e){return}');
  console.log('[+] Patched jee() to no-op (no token expired toast or logout)');
}

// Patch Hee: async function Hee(){...}
const heeIdx = dsCode.indexOf('async function Hee(){');
if (heeIdx !== -1) {
  const heeEnd = dsCode.indexOf('}', dsCode.indexOf('return Vee', heeIdx));
  const origHee = dsCode.substring(heeIdx, heeEnd + 1);
  dsCode = dsCode.replace(origHee, 'async function Hee(){return !0}');
  console.log('[+] Patched Hee() to always return true');
}

// Patch logoutLocal: async logoutLocal(e={name:"login"}){...}
const logoutLocalIdx = dsCode.indexOf('async logoutLocal(');
if (logoutLocalIdx !== -1) {
  const endIdx = dsCode.indexOf('localStorage.setItem("isToLogin","1")}', logoutLocalIdx);
  if (endIdx !== -1) {
    const orig = dsCode.substring(logoutLocalIdx, endIdx + 'localStorage.setItem("isToLogin","1")}'.length);
    dsCode = dsCode.replace(orig, 'async logoutLocal(e){return}');
    console.log('[+] Patched store logoutLocal() to no-op');
  }
}

// Ensure Tt().token always returns demo token if empty
const getTokenIdx = dsCode.indexOf('getToken(e){return e.token}');
if (getTokenIdx !== -1) {
  dsCode = dsCode.replace('getToken(e){return e.token}', 'getToken(e){return e.token||"local_token_1677637"}');
  console.log('[+] Patched getToken getter in Pinia store');
}

fs.writeFileSync('archived_site/assets/js/index-DSllDNEm.js', dsCode, 'utf8');
console.log('Saved index-DSllDNEm.js successfully!');

// 2. Patch archived_site/assets/js/index-C66_Pi5W.js (WinGo component)
let c66Code = fs.readFileSync('archived_site/assets/js/index-C66_Pi5W.js', 'utf8');

// Patch O = async(t=null)=>{...}
// Original: O=async(t=null)=>{await N.getWinGoData(),T=N.getWingo;const v=T.findIndex(p=>p.typeID==e);P.value==null&&!e?H(0):H(t??v)},H=t=>{N.getWinGoData(),G.value=t,P.value=T[t].typeID,z(P.value),Pe(()=>{n.value.getData(P.value)})},z=async t=>{w.value=="MyGameRecord"&&ae(t);const[v,p]=await K(Be({typeId:t}));s.value.gameNo=p.issueNumber,s.value.currentTime=p.serviceTime.replace(/-/g,"/"),s.value.beginTime=p.startTime.replace(/-/g,"/"),ne()},ae=async t=>{const v=await Ae(We({typeId:t}));v&&(j.value=v.data.number.split(","))},ne=()=>{const t=new Date(s.value.currentTime).getTime(),v=new Date(s.value.beginTime).getTime();let p=(t-v)/1e3,b=T[G.value];if(p>b.intervalM*60&&(p=b.intervalM*60),s.value.passTime=b.intervalM*60-p,s.value.passTime<0){Y.value="An error occurred, please contact customer service。The game time is "+b.intervalM+" minutes,start time is "+s.value.beginTime+",current time is"+s.value.currentTime+"!",S.value=!0;return}oe()},

const origBlock = 'O=async(t=null)=>{await N.getWinGoData(),T=N.getWingo;const v=T.findIndex(p=>p.typeID==e);P.value==null&&!e?H(0):H(t??v)},H=t=>{N.getWinGoData(),G.value=t,P.value=T[t].typeID,z(P.value),Pe(()=>{n.value.getData(P.value)})},z=async t=>{w.value=="MyGameRecord"&&ae(t);const[v,p]=await K(Be({typeId:t}));s.value.gameNo=p.issueNumber,s.value.currentTime=p.serviceTime.replace(/-/g,"/"),s.value.beginTime=p.startTime.replace(/-/g,"/"),ne()},ae=async t=>{const v=await Ae(We({typeId:t}));v&&(j.value=v.data.number.split(","))},ne=()=>{const t=new Date(s.value.currentTime).getTime(),v=new Date(s.value.beginTime).getTime();let p=(t-v)/1e3,b=T[G.value];if(p>b.intervalM*60&&(p=b.intervalM*60),s.value.passTime=b.intervalM*60-p,s.value.passTime<0){Y.value="An error occurred, please contact customer service。The game time is "+b.intervalM+" minutes,start time is "+s.value.beginTime+",current time is"+s.value.currentTime+"!",S.value=!0;return}oe()},';

const safeBlock = 'O=async(t=null)=>{await N.getWinGoData(),T=N.getWingo||[];const v=T.findIndex(p=>p.typeID==e);let idx=t??v;if(idx<0||idx>=T.length)idx=0;H(idx)},H=t=>{N.getWinGoData(),T=N.getWingo||[];let idx=(t>=0&&t<T.length)?t:0;G.value=idx,P.value=T[idx]?T[idx].typeID:1,z(P.value),Pe(()=>{n.value&&n.value.getData&&n.value.getData(P.value)})},z=async t=>{w.value=="MyGameRecord"&&ae(t);const[v,p]=await K(Be({typeId:t||1}));if(p){s.value.gameNo=p.issueNumber||"202610010001",s.value.currentTime=(p.serviceTime||"2026/10/01 12:00:00").replace(/-/g,"/"),s.value.beginTime=(p.startTime||"2026/10/01 12:00:00").replace(/-/g,"/"),ne()}},ae=async t=>{const v=await Ae(We({typeId:t||1}));if(v&&v.data){let num=v.data.number||v.data;j.value=Array.isArray(num)?num:(typeof num==="string"?num.split(","):[0,0,0,0,0])}},ne=()=>{const t=new Date(s.value.currentTime).getTime(),v=new Date(s.value.beginTime).getTime();let p=Math.max(0,(t-v)/1e3),b=(T&&T[G.value])||{intervalM:1};let limit=b.intervalM*60;if(p>limit)p=limit;s.value.passTime=Math.max(0,limit-p);oe()},';

if (c66Code.includes(origBlock)) {
  c66Code = c66Code.replace(origBlock, safeBlock);
  fs.writeFileSync('archived_site/assets/js/index-C66_Pi5W.js', c66Code, 'utf8');
  console.log('[+] Successfully patched index-C66_Pi5W.js with safe handlers!');
} else {
  console.log('[-] origBlock not found exactly in index-C66_Pi5W.js, searching parts...');
  const oIdx = c66Code.indexOf('O=async(t=null)=>{');
  if (oIdx !== -1) {
    console.log('O found at:', oIdx, c66Code.substring(oIdx, oIdx + 300));
  }
}
