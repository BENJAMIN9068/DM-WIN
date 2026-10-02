import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = 'https://dmfirst1.com/#/register';
const OUTPUT_DIR = path.resolve('./captured_pages');
const ARCHIVED_SITE_DIR = path.resolve('./archived_site');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function dismissModals(page) {
  try {
    const confirmButtons = await page.$$('button:has-text("Confirm"), .van-button--primary:has-text("Confirm"), button:has-text("confirm"), [class*="confirm"]');
    for (const btn of confirmButtons) {
      if (await btn.isVisible()) {
        console.log('   [+] Dismissed modal via Confirm button');
        await btn.click().catch(() => {});
        await page.waitForTimeout(600);
      }
    }
  } catch (e) {}
}

async function captureRegister() {
  console.log(`[*] Launching Chromium to capture: ${TARGET_URL}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();

  // Intercept and save any asset requests to archived_site
  const savedUrls = new Set();
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const status = response.status();
      if (status !== 200) return;

      if (url.includes('dmfirst1.com')) {
        const urlObj = new URL(url);
        let relativePath = urlObj.pathname;
        if (relativePath && relativePath !== '/') {
          if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
          const localFilePath = path.join(ARCHIVED_SITE_DIR, relativePath);

          if (!savedUrls.has(url) && !fs.existsSync(localFilePath)) {
            savedUrls.add(url);
            const buffer = await response.body().catch(() => null);
            if (buffer) {
              fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
              fs.writeFileSync(localFilePath, buffer);
              console.log(`   [+] Downloaded new asset: ${relativePath}`);
            }
          }
        }
      }
    } catch (e) {}
  });

  console.log(`[*] Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  await dismissModals(page);
  await page.waitForTimeout(1000);

  const finalUrl = page.url();
  console.log(`[*] Page loaded at: ${finalUrl}`);

  // Capture rendered DOM
  const html = await page.content();
  const htmlPath = path.join(OUTPUT_DIR, 'register.html');
  const pngPath = path.join(OUTPUT_DIR, 'register.png');

  fs.writeFileSync(htmlPath, html, 'utf-8');
  await page.screenshot({ path: pngPath, fullPage: true });

  console.log(`[✓] Successfully saved register page DOM to: ${htmlPath}`);
  console.log(`[✓] Successfully saved register screenshot to: ${pngPath}`);

  await browser.close();
}

captureRegister().catch(err => {
  console.error('[!] Error capturing register page:', err);
  process.exit(1);
});
