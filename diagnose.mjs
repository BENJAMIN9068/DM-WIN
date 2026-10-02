import { chromium } from 'playwright';

async function diagnose() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.log(`[PAGE ERROR]`, err.message));
  page.on('requestfailed', req => console.log(`[REQ FAILED]`, req.url(), req.failure()?.errorText));
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}]`, res.url());
    }
  });

  console.log('--- Navigating to http://localhost:3000/#/ ---');
  await page.goto('http://localhost:3000/#/', { waitUntil: 'networkidle' });

  console.log('\n--- Navigating to http://localhost:3000/#/main ---');
  await page.goto('http://localhost:3000/#/main', { waitUntil: 'networkidle' }).catch(e => console.log(e.message));
  await page.waitForTimeout(2000);
  console.log('Current URL:', page.url());

  console.log('\n--- Navigating to WinGo ---');
  await page.goto('http://localhost:3000/#/home/AllLotteryGames/WinGo?gameCode=WinGo_30S', { waitUntil: 'networkidle' }).catch(e => console.log(e.message));
  await page.waitForTimeout(2000);
  console.log('Current URL after WinGo:', page.url());

  await browser.close();
}

diagnose();
