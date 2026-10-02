const fs = require('fs');

const js = fs.readFileSync('archived_site/assets/js/index-DSllDNEm.js', 'utf8');

const regex = /import\(['"](\.\/[^'"]+\.js)['"]\)/g;
let m;
const dynamicChunks = [];
while ((m = regex.exec(js)) !== null) {
  dynamicChunks.push(m[1]);
}

console.log('Dynamic chunks count:', dynamicChunks.length);
console.log('Sample dynamic chunks:', dynamicChunks.slice(0, 30));

const wingoMatches = js.match(/[\w/.-]*WinGo[\w/.-]*/gi);
console.log('WinGo occurrences in bundle:', wingoMatches ? Array.from(new Set(wingoMatches)).slice(0, 20) : 'none');
