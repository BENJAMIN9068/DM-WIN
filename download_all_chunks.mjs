import fs from 'fs';
import path from 'path';
import https from 'https';

const detected = JSON.parse(fs.readFileSync('detected_chunks.json', 'utf8'));

const BASE_URL = 'https://dmfirst1.com';
const OUT_DIR = path.resolve('archived_site');

function downloadFile(relPath) {
  return new Promise((resolve) => {
    if (relPath.startsWith('http:') || relPath.startsWith('https:') || relPath.startsWith('//')) {
      return resolve({ path: relPath, status: 'skipped_external' });
    }
    let cleanPath = relPath.startsWith('/') ? relPath.slice(1) : relPath;
    // ensure it starts with assets/
    if (!cleanPath.startsWith('assets/')) {
      cleanPath = 'assets/' + (cleanPath.endsWith('.css') ? 'css/' : 'js/') + cleanPath;
    }

    // Windows safety
    if (cleanPath.includes(':') || cleanPath.includes('?') || cleanPath.includes('*')) {
      return resolve({ path: relPath, status: 'invalid_chars' });
    }

    const localPath = path.join(OUT_DIR, cleanPath);
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100) {
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

    req.on('error', (err) => {
      resolve({ path: cleanPath, status: 'error', error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ path: cleanPath, status: 'timeout' });
    });
  });
}

async function downloadBatch(items, concurrency = 15) {
  let index = 0;
  let downloaded = 0;
  let failed = 0;
  let total = items.length;

  async function worker() {
    while (index < total) {
      const current = items[index++];
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

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  console.log(`\nCompleted! Total: ${total}, Downloaded: ${downloaded}, Failed/Missing: ${failed}`);
}

async function main() {
  console.log('Downloading all JS chunks...');
  await downloadBatch(detected.js, 15);

  console.log('\nDownloading all CSS chunks...');
  await downloadBatch(detected.css, 15);
}

main();
