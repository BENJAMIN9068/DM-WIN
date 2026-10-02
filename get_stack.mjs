import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('pageerror', err => {
    console.log('STACK:', err.stack);
  });

  await page.goto('http://localhost:3000/#/home/AllLotteryGames/WinGo?typeId=1');
  await page.waitForTimeout(3000);
  await browser.close();
}

run();
