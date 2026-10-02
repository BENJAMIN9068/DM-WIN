import fs from 'fs';
import path from 'path';

const content = fs.readFileSync('archived_site/assets/js/index-DSllDNEm.js', 'utf8');

// Match patterns like "assets/js/index-xxxx.js" or "/assets/js/xxxx.js" or "xxxx.js"
const jsMatches = new Set();
const cssMatches = new Set();

const regex = /["']([^"']+\.(?:js|css))["']/g;
let m;
while ((m = regex.exec(content)) !== null) {
  const p = m[1];
  if (p.includes('/assets/') || p.endsWith('.js') || p.endsWith('.css')) {
    if (p.endsWith('.js')) jsMatches.add(p);
    if (p.endsWith('.css')) cssMatches.add(p);
  }
}

// Also match dynamic import patterns like import("./index-xxxx.js") or "__vitePreload"
const importRegex = /assets\/(?:js|css)\/[A-Za-z0-9_-]+\.(?:js|css)/g;
while ((m = importRegex.exec(content)) !== null) {
  if (m[0].endsWith('.js')) jsMatches.add(m[0]);
  if (m[0].endsWith('.css')) cssMatches.add(m[0]);
}

console.log('Found JS files count:', jsMatches.size);
console.log('Found CSS files count:', cssMatches.size);
console.log('Sample JS files:', Array.from(jsMatches).slice(0, 30));
console.log('Sample CSS files:', Array.from(cssMatches).slice(0, 30));

fs.writeFileSync('detected_chunks.json', JSON.stringify({
  js: Array.from(jsMatches),
  css: Array.from(cssMatches)
}, null, 2));
