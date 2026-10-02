import fs from 'fs';

const html = fs.readFileSync('archived_site/index.html', 'utf8');
const allScripts = [];
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  allScripts.push(match[0]);
}
console.log('All scripts in archived_site/index.html:');
allScripts.forEach((s, idx) => console.log(`Script #${idx}:`, s.slice(0, 200)));
