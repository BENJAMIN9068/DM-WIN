import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    isMobile: true
  });
  const page = await context.newPage();

  const logs = [];
  const errors = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(err.toString()));

  console.log('--- Testing http://localhost:3000/home/AllLotteryGames/WinGo ---');
  await page.goto('http://localhost:3000/home/AllLotteryGames/WinGo', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log('Final URL 1:', page.url());
  await page.screenshot({ path: 'test_url1.png' });

  console.log('--- Testing http://localhost:3000/#/home/AllLotteryGames/WinGo?typeId=1 ---');
  await page.goto('http://localhost:3000/#/home/AllLotteryGames/WinGo?typeId=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log('Final URL 2:', page.url());
  await page.screenshot({ path: 'test_url2.png' });

  console.log('--- Testing http://localhost:3000/#/ ---');
  await page.goto('http://localhost:3000/#/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log('Final URL 3:', page.url());
  await page.screenshot({ path: 'test_url3.png' });

  console.log('\n--- ERRORS ---');
  console.log(errors.join('\n') || 'None');

  console.log('\n--- CONSOLE LOGS ---');
  console.log(logs.slice(-25).join('\n'));

  await browser.close();
}

run().catch(console.error);
