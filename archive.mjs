import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = 'https://dmfirst1.com';
const OUTPUT_DIR = path.join(__dirname, 'archived_site');
const ASSETS_DIR = path.join(OUTPUT_DIR, 'assets');

// Ensure output directories exist
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(ASSETS_DIR, { recursive: true });

async function archiveSite() {
  console.log(`[*] Launching Chromium to archive client-rendered SPA: ${TARGET_URL}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'ArchivalBot/1.0 (+https://example.com/bot; for offline backup)',
    viewport: { width: 430, height: 932 }, // Mobile emulation (since target is mobile-first entertainment SPA)
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  // Intercept and save network responses (images, styles, icons, fonts, json)
  const savedUrls = new Set();
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const status = response.status();
      if (status !== 200 || !url.startsWith('https://dmfirst1.com')) return;

      const urlObj = new URL(url);
      let relativePath = urlObj.pathname;
      if (relativePath === '/' || relativePath === '') return;

      if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
      const filePath = path.join(OUTPUT_DIR, relativePath);

      if (!savedUrls.has(url)) {
        savedUrls.add(url);
        const buffer = await response.body().catch(() => null);
        if (buffer) {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, buffer);
          console.log(`[+] Captured asset: ${relativePath}`);
        }
      }
    } catch (e) {
      // Ignore response read errors for transient/aborted requests
    }
  });

  console.log(`[*] Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });

  // Additional wait to ensure full hydration and animations settle
  await page.waitForTimeout(4000);

  // Extract rendered HTML
  console.log('[*] Extracting fully rendered DOM content...');
  const renderedHtml = await page.content();
  const indexHtmlPath = path.join(OUTPUT_DIR, 'index.html');
  fs.writeFileSync(indexHtmlPath, renderedHtml, 'utf-8');

  // Capture full page screenshot
  console.log('[*] Capturing full page preview screenshot...');
  const previewPath = path.join(OUTPUT_DIR, 'rendered_preview.png');
  await page.screenshot({ path: previewPath, fullPage: true });

  // Capture metadata and SPA route structure
  const pageTitle = await page.title();
  const metaInfo = await page.evaluate(() => {
    const metas = Array.from(document.querySelectorAll('meta')).map(m => ({
      name: m.getAttribute('name') || m.getAttribute('property'),
      content: m.getAttribute('content')
    })).filter(m => m.name && m.content);

    const links = Array.from(document.querySelectorAll('a')).map(a => a.href).filter(Boolean);
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]')).map(b => b.innerText?.trim()).filter(Boolean);

    return { title: document.title, metas, links, sampleButtons: buttons.slice(0, 15) };
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'site_metadata.json'),
    JSON.stringify(metaInfo, null, 2),
    'utf-8'
  );

  console.log(`\n========================================`);
  console.log(`[✓] Archive complete!`);
  console.log(`- Title: ${pageTitle}`);
  console.log(`- Captured Assets: ${savedUrls.size}`);
  console.log(`- Rendered DOM: ${indexHtmlPath}`);
  console.log(`- Full Preview: ${previewPath}`);
  console.log(`- Metadata JSON: ${path.join(OUTPUT_DIR, 'site_metadata.json')}`);
  console.log(`========================================\n`);

  await browser.close();
}

archiveSite().catch(err => {
  console.error('[!] Archiving failed:', err);
  process.exit(1);
});
