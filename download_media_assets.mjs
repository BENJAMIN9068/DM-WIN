import fs from 'fs';
import path from 'path';
import https from 'https';

const OUT_DIR = path.resolve('archived_site');
const JS_DIR = path.join(OUT_DIR, 'assets', 'js');
const BASE_URL = 'https://dmfirst1.com';

const allAssets = new Set();

// Scan all JS files in assets/js
const files = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js'));
for (const file of files) {
  try {
    const code = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
    const regex = /["'](\/assets\/[^"']+\.(?:png|jpg|jpeg|svg|webp|mp3|woff|woff2|ttf|js|css))["']/g;
    let m;
    while ((m = regex.exec(code)) !== null) {
      allAssets.add(m[1]);
    }
    // Also assets/ without leading slash
    const regex2 = /["'](assets\/[^"']+\.(?:png|jpg|jpeg|svg|webp|mp3|woff|woff2|ttf|js|css))["']/g;
    while ((m = regex2.exec(code)) !== null) {
      allAssets.add('/' + m[1]);
    }
  } catch (e) {}
}

console.log('Total discovered media/assets from JS:', allAssets.size);

function downloadFile(relPath) {
  return new Promise((resolve) => {
    let cleanPath = relPath.startsWith('/') ? relPath.slice(1) : relPath;
    if (cleanPath.includes(':') || cleanPath.includes('?') || cleanPath.includes('*')) {
      return resolve({ path: relPath, status: 'invalid_chars' });
    }

    const localPath = path.join(OUT_DIR, cleanPath);
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 10) {
      return resolve({ path: cleanPath, status: 'already_exists' });
    }

    fs.mkdirSync(path.dirname(localPath), { recursive: true });

    const fileUrl = `${BASE_URL}/${cleanPath}`;
    const req = https.get(fileUrl, { timeout: 10000 }, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(localPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve({ path: cleanPath, status: 200, size: fs.statSync(localPath).size });
        });
      } else {
        res.resume();
        resolve({ path: cleanPath, status: res.statusCode });
      }
    });

    req.on('error', (err) => resolve({ path: cleanPath, status: 'error', error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ path: cleanPath, status: 'timeout' }); });
  });
}

async function main() {
  const list = Array.from(allAssets);
  let index = 0;
  let downloaded = 0;
  let failed = 0;
  const total = list.length;
  const concurrency = 20;

  async function worker() {
    while (index < total) {
      const current = list[index++];
      const res = await downloadFile(current);
      if (res.status === 200 || res.status === 'already_exists') {
        downloaded++;
      } else {
        failed++;
      }
      if ((downloaded + failed) % 50 === 0 || (downloaded + failed) === total) {
        console.log(`Progress: ${downloaded + failed}/${total} (Success: ${downloaded}, Failed: ${failed})`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`Finished downloading media! Success: ${downloaded}, Failed: ${failed}`);
}

main();
