import fs from 'fs';

const code = fs.readFileSync('archived_site/assets/js/index-DSllDNEm.js', 'utf8');
console.log('Size of index-DSllDNEm.js:', code.length);

// 1. Search for beforeEach
let idx = 0;
while ((idx = code.indexOf('beforeEach', idx)) !== -1) {
  console.log('beforeEach at', idx, ':', code.substring(idx - 60, idx + 140));
  idx += 10;
}

// 2. Search for /login redirect or name: "login"
idx = 0;
let loginMatches = 0;
while ((idx = code.indexOf('name:"login"', idx)) !== -1) {
  console.log('name:login at', idx, ':', code.substring(idx - 80, idx + 100));
  loginMatches++;
  idx += 12;
  if (loginMatches > 5) break;
}

// 3. Search for error Gae (t.map is not a function)
const gaePos = code.indexOf('function Gae(');
console.log('Gae function at:', gaePos);
if (gaePos !== -1) {
  console.log(code.substring(gaePos, gaePos + 400));
} else {
  // search Gae= or Gae
  let p = code.indexOf('Gae');
  console.log('First Gae at:', p);
}
