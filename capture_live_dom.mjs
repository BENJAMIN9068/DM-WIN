import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://dmfirst1.com/';
const OUTPUT_DIR = path.resolve('./captured_pages');
const SESSION_FILE = path.resolve('./auth_session.json');

const USERNAME = process.env.ARCHIVE_MOBILE_NUMBER || '9068839558';
const PASSWORD = process.env.ARCHIVE_PASSWORD || 'QWERTY123';

const TARGET_ROUTES = [
  'saasLottery/WinGo?gameCode=WinGo_30S&lottery=WinGo',
  'wallet/Recharge'
];

async function dismissModals(page) {
  try {
    // Dismiss "Welcome to DMFIRST" or announcements
    const confirmButtons = await page.$$('button:has-text("Confirm"), .van-button--primary:has-text("Confirm"), button:has-text("confirm"), .dialog-btn, [class*="confirm"]');
    for (const btn of confirmButtons) {
      if (await btn.isVisible()) {
        console.log('[*] Dismissing popup modal via Confirm button...');
        await btn.click().catch(() => {});
        await page.waitForTimeout(800);
      }
    }

    const closeButtons = await page.$$('.van-popup__close-icon, .close-icon, [class*="close"], .van-icon-cross');
    for (const btn of closeButtons) {
      if (await btn.isVisible()) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  } catch (e) {}
}

async function run() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('[*] Launching Chromium to capture live DOM from dmfirst1.com...');
  const browser = await chromium.launch({ headless: true });

  const contextOptions = {
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    ...(fs.existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {})
  };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // Step 1: Go to base URL and dismiss startup popups
  console.log('[*] Navigating to initial page...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await dismissModals(page);

  // Check login state: if not logged in, perform login
  const isBalanceVisible = await page.$('.Balance, [class*="balance"], [class*="Balance"]');
  if (!isBalanceVisible) {
    console.log('[*] Performing login on live page...');
    const loginTrigger = await page.$('button:has-text("Log in"), .btn-login, [class*="login"]');
    if (loginTrigger) {
      await loginTrigger.click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    const userSelector = 'input:not([readonly])[type="tel"], input:not([readonly])[type="text"], input[placeholder*="number"], input[placeholder*="Phone"]';
    const passSelector = 'input[type="password"], input[placeholder*="Password"]';
    const submitSelector = 'button[type="submit"], button:has-text("Log in"), .login-btn, [class*="submit"]';

    if (await page.$(userSelector)) {
      await page.fill(userSelector, USERNAME);
      await page.fill(passSelector, PASSWORD);
      const submitBtn = await page.$(submitSelector);
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(4000);
      }
    }
    await dismissModals(page);
    await context.storageState({ path: SESSION_FILE });
  }

  // Step 2: Navigate dynamically to each SPA route using hash change inside live Chrome
  for (const route of TARGET_ROUTES) {
    console.log(`\n========================================`);
    console.log(`[*] Live Navigating to route: #/${route}`);

    // Set hash directly in the SPA and trigger hashchange
    await page.evaluate((targetRoute) => {
      window.location.hash = `#/${targetRoute}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, route);

    // Wait for Vue/SPA router to update DOM and finish rendering
    await page.waitForTimeout(4000);
    await dismissModals(page);
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`[*] Current browser URL: ${currentUrl}`);

    // If still on home due to router guard, click on element directly or reload with hash
    if (!currentUrl.includes(route.split('?')[0])) {
      console.log(`[*] Retrying direct navigation to: ${BASE_URL}#/${route}`);
      await page.goto(`${BASE_URL}#/${route}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(3000);
      await dismissModals(page);
    }

    // Capture the live rendered DOM
    const htmlContent = await page.content();
    const cleanName = route.replace(/[/#?=&]/g, '_').replace(/^_+/, '');
    const htmlPath = path.join(OUTPUT_DIR, `${cleanName}.html`);
    const pngPath = path.join(OUTPUT_DIR, `${cleanName}.png`);

    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    await page.screenshot({ path: pngPath, fullPage: true });

    console.log(`[✓] Captured LIVE DOM: ${htmlPath}`);
    console.log(`[✓] Captured Screenshot: ${pngPath}`);
  }

  await browser.close();
  console.log(`\n[✓] Finished capturing all live DOM routes!`);
}

run().catch(console.error);
