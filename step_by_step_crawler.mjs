import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const LOGIN_URL = 'https://dmfirst1.com/#/login';
const OUTPUT_DIR = path.resolve('./captured_pages');
const SESSION_FILE = path.resolve('./auth_session.json');

const USERNAME = process.env.ARCHIVE_MOBILE_NUMBER || '9068839558';
const PASSWORD = process.env.ARCHIVE_PASSWORD || 'QWERTY123';

const TARGET_ROUTES = [
  { name: 'login', hash: '#/login' },
  { name: 'home', hash: '#/home' },
  { name: 'wingo_30s', hash: '#/saasLottery/WinGo?gameCode=WinGo_30S&lottery=WinGo' },
  { name: 'wallet_recharge', hash: '#/wallet/Recharge' },
  { name: 'wallet_withdraw', hash: '#/wallet/Withdraw' },
  { name: 'activity', hash: '#/activity' },
  { name: 'promotion', hash: '#/promotion' },
  { name: 'main_account', hash: '#/main' }
];

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

async function captureCurrentView(page, routeName) {
  await page.waitForTimeout(3000);
  await dismissModals(page);
  await page.waitForTimeout(1000);

  const html = await page.content();
  const htmlPath = path.join(OUTPUT_DIR, `${routeName}.html`);
  const pngPath = path.join(OUTPUT_DIR, `${routeName}.png`);

  fs.writeFileSync(htmlPath, html, 'utf-8');
  await page.screenshot({ path: pngPath, fullPage: true });

  console.log(`   [✓] Captured DOM: ${routeName}.html`);
  console.log(`   [✓] Captured Screenshot: ${routeName}.png`);
  console.log(`   [✓] Current URL: ${page.url()}`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('[*] Step 1: Launching live Chrome (Mobile Viewport)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();

  // 1. DIRECT TO LOGIN URL
  console.log(`\n========================================`);
  console.log(`[*] Step 2: Navigating directly to Login page: ${LOGIN_URL}`);
  console.log(`========================================`);
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await dismissModals(page);

  // Capture login view DOM
  await captureCurrentView(page, '01_login_page');

  // Fill in login credentials
  console.log(`\n[*] Step 3: Entering credentials for ${USERNAME}...`);
  const userSelector = 'input:not([readonly])[type="tel"], input:not([readonly])[type="text"], input[placeholder*="number"], input[placeholder*="Phone"], input[placeholder*="phone"]';
  const passSelector = 'input[type="password"], input[placeholder*="Password"], input[placeholder*="password"]';
  const submitSelector = 'button[type="submit"], button:has-text("Log in"), .login-btn, [class*="submit"], button.btn';

  const userField = await page.$(userSelector);
  const passField = await page.$(passSelector);

  if (userField && passField) {
    await userField.fill(USERNAME);
    await passField.fill(PASSWORD);
    console.log('   [+] Filled Phone & Password');

    const submitBtn = await page.$(submitSelector);
    if (submitBtn) {
      console.log('   [+] Clicking Login button...');
      await submitBtn.click();
      await page.waitForTimeout(5000);
      await dismissModals(page);
    }
  } else {
    console.log('   [!] User/Password fields not found, checking current state...');
  }

  // Save auth state
  await context.storageState({ path: SESSION_FILE });
  console.log(`   [+] Auth state saved to ${SESSION_FILE}`);
  console.log(`   [+] Post-login URL: ${page.url()}`);

  // Capture authenticated home
  await captureCurrentView(page, '02_authenticated_home');

  // 2. NAVIGATE EACH TARGET ROUTE STEP BY STEP
  for (let i = 2; i < TARGET_ROUTES.length; i++) {
    const route = TARGET_ROUTES[i];
    console.log(`\n========================================`);
    console.log(`[*] Step ${i + 2}: Capturing Route: ${route.name} (${route.hash})`);
    console.log(`========================================`);

    // Dynamic hash navigation inside SPA
    await page.evaluate((targetHash) => {
      window.location.hash = targetHash;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, route.hash);

    await page.waitForTimeout(3500);
    await dismissModals(page);

    // If route didn't change, navigate via page.goto
    const currentUrl = page.url();
    if (!currentUrl.includes(route.hash.split('?')[0].replace('#/', ''))) {
      console.log(`   [*] Reloading directly with URL: https://dmfirst1.com/${route.hash}`);
      await page.goto(`https://dmfirst1.com/${route.hash}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(3500);
      await dismissModals(page);
    }

    await captureCurrentView(page, `0${i + 1}_${route.name}`);
  }

  await browser.close();
  console.log(`\n[✓] ALL STEPS COMPLETED! Check ./captured_pages/ for full DOMs & Screenshots`);
}

main().catch(console.error);
