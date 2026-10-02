import fs from 'fs';

let code = fs.readFileSync('archived_site/assets/js/index-DSllDNEm.js', 'utf8');
const originalLength = code.length;
console.log('Original bundle size:', originalLength);

// 1. Replace Ye.beforeEach
const beforeEachTarget = 'pte(Ye);Ye.beforeEach(async(e,t,n)=>{const r=Tt();await MO();let o=["/","/main/About/AboutDetail","/main/SettingCenter/LoginPassword","/main/SettingCenter","/maintenance"];if(!Iae()&&!rz()&&await Nae()==1&&e.name!=="installApp")return n({name:"installApp"});if(Number(localStorage.getItem("isToLogin"))==1||o.includes(t.path)&&e.path===Ys)return localStorage.setItem("isToLogin","2"),n();if(e.path===Ys)return r.token?n(ax(e)||"/"):n();if(Nq.includes(e.path)||e.path.startsWith("/preview/"))return n();if(!r.token){const i=ix(e.fullPath);return n({path:Ys,...i?{query:i}:{},replace:!0})}["/main"].includes(e.path)&&r.notifyARGame(),n()});';

if (code.includes(beforeEachTarget)) {
  const replacement = 'pte(Ye);const _op=Ye.push,_or=Ye.replace;Ye.push=function(to,...args){if(to==="/login"||to==="login"||to?.name==="login"||to?.path==="/login")return Promise.resolve();return _op.call(this,to,...args)};Ye.replace=function(to,...args){if(to==="/login"||to==="login"||to?.name==="login"||to?.path==="/login")return Promise.resolve();return _or.call(this,to,...args)};Ye.beforeEach((e,t,n)=>{n()});';
  code = code.replace(beforeEachTarget, replacement);
  console.log('[+] Patched Ye.beforeEach and router push/replace guards');
} else {
  console.log('[-] beforeEachTarget not found exactly, searching partial...');
  const idx = code.indexOf('pte(Ye);Ye.beforeEach(');
  console.log('Found at:', idx);
  if (idx !== -1) {
    console.log(code.substring(idx, idx + 400));
  }
}

// 2. Fix Gae function (t.map is not a function)
const gaeTarget = 'function Gae(){const{code:e,data:t}=await Zue();if(e!=0)return;const n=t.map(r=>({jumpDomain:r.startsWith("http")?r:_z(r)}));';
if (code.includes(gaeTarget)) {
  code = code.replace(gaeTarget, 'function Gae(){const{code:e,data:t}=await Zue();if(e!=0||!Array.isArray(t))return;const n=t.map(r=>({jumpDomain:r.startsWith("http")?r:_z(r)}));');
  console.log('[+] Patched Gae function (t.map guard)');
} else {
  console.log('[-] Gae function not matched exactly');
}

// 3. Fix b(p) game launcher check
const bpTarget = 'function b(p){if(!Tt().token){t.push({name:"login"});return}';
if (code.includes(bpTarget)) {
  code = code.replace(bpTarget, 'function b(p){');
  console.log('[+] Patched b(p) launcher login check');
} else {
  console.log('[-] bpTarget not found, searching...');
  const bpIdx = code.indexOf('function b(p){');
  if (bpIdx !== -1) {
    console.log('b(p) at:', bpIdx, code.substring(bpIdx, bpIdx + 100));
  }
}

// 4. Mc() login verification
const mcTarget = 'async function Mc(){';
const mcIdx = code.indexOf(mcTarget);
if (mcIdx !== -1) {
  console.log('Mc() at:', mcIdx, code.substring(mcIdx, mcIdx + 120));
  // Replace Mc body with return true
  const mcEnd = code.indexOf('}', mcIdx);
  const origMc = code.substring(mcIdx, mcEnd + 1);
  code = code.replace(origMc, 'async function Mc(){return !0}');
  console.log('[+] Patched Mc() to always return true');
} else {
  console.log('[-] Mc() not found');
}

// 5. Tt token getter - default to demo token if empty
const ttTokenTarget = 'token:()=>localStorage.getItem("token")';
const ttTokenIdx = code.indexOf('token:(');
console.log('token getter at:', ttTokenIdx !== -1 ? code.substring(ttTokenIdx, ttTokenIdx + 80) : 'not found');

fs.writeFileSync('archived_site/assets/js/index-DSllDNEm.js', code, 'utf8');
console.log('Finished writing patched bundle! New size:', code.length);
