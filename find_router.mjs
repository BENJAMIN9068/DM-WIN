import fs from 'fs';

const content = fs.readFileSync('archived_site/assets/js/index-DSllDNEm.js', 'utf8');

// Search for Nq
let idx = 0;
while ((idx = content.indexOf('Nq', idx)) !== -1) {
  console.log(`\nMatch at ${idx}:`);
  console.log(content.slice(Math.max(0, idx - 80), Math.min(content.length, idx + 120)));
  idx += 2;
  if (idx > 1000000) break;
}
