import fs from 'fs';

const code = fs.readFileSync('archived_site/assets/js/index-DSllDNEm.js', 'utf8');

// Find Zue
const zueIdx = code.indexOf('Zue=');
console.log('Zue at:', zueIdx);
if (zueIdx !== -1) {
  console.log(code.substring(zueIdx - 50, zueIdx + 200));
}

// Check public9Home
const p9 = fs.readFileSync('archived_site/assets/js/public9Home-kFpU19Ve.js', 'utf8');
const feIdx = p9.indexOf('ve({pageNo:1,pageSize:5})');
console.log('feIdx in p9:', feIdx);
console.log(p9.substring(feIdx - 150, feIdx + 100));
// Also check imports in p9
console.log('p9 imports:', p9.substring(0, 300));
