import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  
  await page.goto('http://localhost:3000/home/AllLotteryGames/WinGo');
  await page.waitForTimeout(3000);
  
  console.log('URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('BODY TEXT LENGTH:', bodyText.length);
  console.log('BODY TEXT PREVIEW:\n', bodyText.slice(0, 300));
  
  const appHtml = await page.evaluate(() => document.getElementById('app')?.innerHTML?.slice(0, 500));
  console.log('APP HTML PREVIEW:\n', appHtml);

  await browser.close();
}

check();
