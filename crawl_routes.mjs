import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Target base URL
const BASE_URL = process.env.BASE_URL || 'https://dmfirst1.com/#/';

// Retrieve credentials safely from environment variables
const USERNAME = process.env.ARCHIVE_MOBILE_NUMBER || process.env.APP_USER || '9068839558';
const PASSWORD = process.env.ARCHIVE_PASSWORD || process.env.APP_PASSWORD || 'QWERTY123';

const OUTPUT_DIR = path.resolve('./captured_pages');
const ARCHIVED_SITE_DIR = path.resolve('./archived_site');
const API_RESPONSES_DIR = path.resolve('./captured_api_responses');
const SESSION_FILE = path.resolve('./auth_session.json');

// Exact target routes requested by the user
const TARGET_ROUTES = [
  '/#/vip',
  '/#/turntable',
  '/#/activity/Turntable',
  '/#/activity/PointMall',
  '/#/activity/PointMall/MyOrders',
  '/#/main/About/AboutDetail',
  '/#/promotion/RebateRatio',
  '/#/activity',
  '/#/activity/DailySignIn'
];

async function authenticate(browser) {
  console.log('[*] Step 1: Performing authentication on ' + BASE_URL + '...');
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  console.log('[*] Opening https://dmfirst1.com/#/login...');
  await page.goto('https://dmfirst1.com/#/login', { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Dismiss any popups
  try {
    const confirms = await page.$$('button:has-text("Confirm"), .van-button--primary, [class*="dialog"] button');
    for (const b of confirms) {
      if (await b.isVisible()) await b.click().catch(() => {});
    }
  } catch (e) {}

  const userSelector = 'input:not([readonly])[type="tel"], input:not([readonly])[type="text"], input[placeholder*="number"], input[placeholder*="Phone"], input[placeholder*="phone"]';
  const passSelector = 'input[type="password"], input[placeholder*="Password"], input[placeholder*="password"]';
  const submitSelector = 'button[type="submit"], button:has-text("Log in"), .login-btn, [class*="submit"], button.btn';

  const userField = await page.$(userSelector);
  if (userField && USERNAME && PASSWORD) {
    console.log(`[*] Submitting credentials for ${USERNAME}...`);
    await page.fill(userSelector, USERNAME);
    await page.fill(passSelector, PASSWORD);
    const submitBtn = await page.$(submitSelector);
    if (submitBtn) {
      await submitBtn.click();
      console.log('[*] Login button clicked, waiting for session...');
      await page.waitForTimeout(5000);
    }
  }

  await context.storageState({ path: SESSION_FILE });
  console.log(`[+] Authentication state saved to ${SESSION_FILE}`);
  await context.close();
}

async function scrapePages(browser) {
  console.log('[*] Step 2: Crawling target routes using saved session state...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(API_RESPONSES_DIR, { recursive: true });

  const contextOptions = {
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    ...(fs.existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {})
  };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  const savedAssets = new Set();
  const apiResponses = {};

  // Intercept and archive all static assets and API responses
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const status = response.status();
      if (status !== 200) return;

      // Capture API responses
      if (url.includes('/api/webapi/')) {
        const json = await response.json().catch(() => null);
        if (json) {
          const apiName = url.split('/api/webapi/')[1].split('?')[0];
          apiResponses[apiName] = json;
          const apiFile = path.join(API_RESPONSES_DIR, `${apiName}.json`);
          fs.writeFileSync(apiFile, JSON.stringify(json, null, 2), 'utf-8');
        }
      }

      // Capture static JS/CSS/image/svg/webp/font assets
      if ((url.includes('dmfirst1.com') || url.includes('ossimg.dmfirst9acting.com') || url.includes('ossimg.')) && !url.includes('/api/')) {
        const urlObj = new URL(url);
        let rel = urlObj.pathname;
        if (rel && rel !== '/' && !rel.endsWith('.html')) {
          if (rel.startsWith('/')) rel = rel.slice(1);
          const localPath = path.join(ARCHIVED_SITE_DIR, rel);
          if (!savedAssets.has(url) && !fs.existsSync(localPath)) {
            savedAssets.add(url);
            const buffer = await response.body().catch(() => null);
            if (buffer) {
              fs.mkdirSync(path.dirname(localPath), { recursive: true });
              fs.writeFileSync(localPath, buffer);
            }
          }
        }
      }
    } catch (e) {}
  });

  for (const route of TARGET_ROUTES) {
    const fullUrl = `https://dmfirst1.com${route}`;
    console.log(`\n[*] Visiting: ${fullUrl}`);

    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 35000 }).catch(e => console.log('  Wait timeout, continuing...'));
      await page.waitForTimeout(3000);

      // Dismiss any popups if present
      try {
        const dialogBtns = await page.$$('.van-dialog__confirm, .van-button--primary, button:has-text("Confirm")');
        for (const btn of dialogBtns) {
          if (await btn.isVisible()) {
            await btn.click().catch(() => {});
            await page.waitForTimeout(500);
          }
        }
      } catch (e) {}

      const htmlContent = await page.content();

      const cleanName = route.replace(/[/#?=&]/g, '_').replace(/^_+/, '') || 'index';
      const filePath = path.join(OUTPUT_DIR, `${cleanName}.html`);
      const screenshotPath = path.join(OUTPUT_DIR, `${cleanName}.png`);

      fs.writeFileSync(filePath, htmlContent, 'utf-8');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      console.log(`    [✓] Saved: ${cleanName}.html and ${cleanName}.png`);
    } catch (err) {
      console.error(`    [x] Failed to capture ${fullUrl}:`, err.message);
    }
  }

  // Save all accumulated API responses
  fs.writeFileSync(path.join(API_RESPONSES_DIR, 'all_captured_apis.json'), JSON.stringify(apiResponses, null, 2), 'utf-8');
  console.log(`\n[+] Saved ${Object.keys(apiResponses).length} API endpoints to ${API_RESPONSES_DIR}`);

  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    if (!fs.existsSync(SESSION_FILE)) {
      if (USERNAME && PASSWORD) {
        await authenticate(browser);
      }
    } else {
      console.log(`[+] Using existing valid session from: ${SESSION_FILE}`);
    }
    await scrapePages(browser);
    console.log(`\n[+] Completed! All page snapshots saved in: ${OUTPUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
