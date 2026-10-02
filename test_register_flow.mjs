import { chromium } from 'playwright';

async function testRegister() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    isMobile: true
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      console.log('API REQ:', req.method(), req.url(), req.postData());
    }
  });
  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      try {
        const body = await res.text();
        console.log('API RES:', res.status(), res.url(), body.slice(0, 200));
      } catch (e) {}
    }
  });

  console.log('Navigating to http://localhost:3000/#/register ...');
  await page.goto('http://localhost:3000/#/register', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Fill in phone number
  const phoneInputs = await page.$$('input[type="tel"], input[placeholder*="phone"], input[placeholder*="number"]');
  console.log('Found phone inputs:', phoneInputs.length);
  for (const input of phoneInputs) {
    const isReadonly = await input.getAttribute('readonly');
    if (!isReadonly) {
      await input.fill('9876543210');
      console.log('Filled phone input with 9876543210');
      break;
    }
  }

  // Fill in password
  const pwdInputs = await page.$$('input[type="password"]');
  console.log('Found pwd inputs:', pwdInputs.length);
  if (pwdInputs.length >= 2) {
    await pwdInputs[0].fill('Password123');
    await pwdInputs[1].fill('Password123');
    console.log('Filled passwords');
  }

  // Check agreement checkbox if not checked
  const checkbox = await page.$('.van-checkbox');
  if (checkbox) {
    await checkbox.click();
    console.log('Clicked checkbox');
  }

  // Click register button
  const regBtn = await page.$('button:has-text("Register"), button:has-text("register"), [class*="button"] button');
  if (regBtn) {
    console.log('Clicking register button...');
    await regBtn.click();
  }

  await page.waitForTimeout(5000);
  console.log('Current URL:', page.url());

  // Check if any toast or dialog is shown
  const toasts = await page.$$eval('.van-toast, .van-dialog, [class*="toast"]', els => els.map(e => e.textContent));
  console.log('Visible toasts/alerts:', toasts);

  await browser.close();
}

testRegister().catch(console.error);
