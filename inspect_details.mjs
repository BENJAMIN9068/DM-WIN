import fs from 'fs';

const code = fs.readFileSync('archived_site/assets/js/index-DSllDNEm.js', 'utf8');
console.log('=== BEFOREEACH CODE ===');
console.log(code.substring(1061380, 1062500));

if (fs.existsSync('archived_site/assets/js/public9Home-kFpU19Ve.js')) {
  const p9 = fs.readFileSync('archived_site/assets/js/public9Home-kFpU19Ve.js', 'utf8');
  console.log('=== PUBLIC9HOME AROUND 6470 ===');
  console.log(p9.substring(6300, 6700));
} else {
  console.log('public9Home file not found at expected path');
}
