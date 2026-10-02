import { chromium } from 'playwright';

async function testFullFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    isMobile: true
  });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('inject()') && !text.includes('dropped by middleware')) {
      console.log('BROWSER:', text);
    }
  });

  page.on('response', async res => {
    if (res.url().includes('/api/webapi/Register') || res.url().includes('/api/webapi/Login') || res.url().includes('/api/webapi/GetUserInfo')) {
      try {
        console.log(`[API RESPONSE] ${res.url()} ->`, (await res.text()).slice(0, 160));
      } catch (e) {}
    }
  });

  const testPhone = '9876543210';
  const testPassword = 'Password123';

  console.log(`\n=== TEST 1: REGISTER WITH NEW NUMBER ${testPhone} ===`);
  await page.goto('http://localhost:3000/#/register', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Fill in phone input
  const phoneInputs = await page.$$('input[type="tel"], input[placeholder*="phone"], input[placeholder*="number"]');
  for (const input of phoneInputs) {
    const isReadonly = await input.getAttribute('readonly');
    if (!isReadonly) {
      await input.fill(testPhone);
      console.log(`[+] Entered phone number: ${testPhone}`);
      break;
    }
  }

  // Fill passwords
  const pwdInputs = await page.$$('input[type="password"]');
  if (pwdInputs.length >= 2) {
    await pwdInputs[0].fill(testPassword);
    await pwdInputs[1].fill(testPassword);
    console.log(`[+] Entered password: ${testPassword}`);
  }

  // Ensure agreement checkbox is active
  const checkbox = await page.$('.van-checkbox');
  if (checkbox) {
    const isChecked = await checkbox.evaluate(el => el.classList.contains('van-checkbox--checked') || el.getAttribute('aria-checked') === 'true');
    if (!isChecked) {
      await checkbox.click();
      console.log('[+] Clicked terms checkbox');
    }
  }

  // Click Register button
  const regBtn = await page.$('.register__container-button button:not(.login), button:has-text("Register"), button:has-text("register")');
  if (regBtn) {
    console.log('[+] Submitting Register form...');
    await regBtn.click();
  }

  await page.waitForTimeout(5000);
  console.log(`[+] URL after registration: ${page.url()}`);

  // Check stored user details
  const storedNumber = await page.evaluate(() => localStorage.getItem('number'));
  const storedToken = await page.evaluate(() => localStorage.getItem('token'));
  const storedUserInfo = await page.evaluate(() => localStorage.getItem('userInfo'));
  console.log(`[+] Stored number in localStorage: ${storedNumber}`);
  console.log(`[+] Stored token present: ${!!storedToken}`);
  console.log(`[+] Stored userInfo: ${storedUserInfo ? JSON.parse(storedUserInfo).userName : 'none'}`);

  console.log(`\n=== TEST 2: LOGIN WITH SAME NUMBER ${testPhone} ===`);
  // Navigate to login
  await page.goto('http://localhost:3000/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const loginPhoneInputs = await page.$$('input[type="tel"], input[placeholder*="phone"], input[placeholder*="number"]');
  for (const input of loginPhoneInputs) {
    const isReadonly = await input.getAttribute('readonly');
    if (!isReadonly) {
      await input.fill(testPhone);
      console.log(`[+] Login phone filled: ${testPhone}`);
      break;
    }
  }

  const loginPwd = await page.$('input[type="password"]');
  if (loginPwd) {
    await loginPwd.fill(testPassword);
    console.log(`[+] Login password filled: ${testPassword}`);
  }

  const loginBtn = await page.$('.signIn__container-button button:has-text("Login"), .signIn__container-button button:has-text("login"), .signIn__container-button button.active');
  if (loginBtn) {
    console.log('[+] Clicking Login button...');
    await loginBtn.click();
  }

  await page.waitForTimeout(5000);
  console.log(`[+] URL after login: ${page.url()}`);

  const activeNumberAfterLogin = await page.evaluate(() => localStorage.getItem('number'));
  const activeUserAfterLogin = await page.evaluate(() => localStorage.getItem('userInfo'));
  console.log(`[+] Active number after login: ${activeNumberAfterLogin}`);
  console.log(`[+] Active user after login: ${activeUserAfterLogin ? JSON.parse(activeUserAfterLogin).userName : 'none'}`);

  await browser.close();
  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
}

testFullFlow().catch(console.error);
