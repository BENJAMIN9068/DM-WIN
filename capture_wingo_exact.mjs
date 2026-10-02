import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function captureWinGoGame() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: './auth_session.json',
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  // Try direct route: /#/home/AllLotteryGames/WinGo
  const wingoUrl = 'https://dmfirst1.com/#/home/AllLotteryGames/WinGo?gameCode=WinGo_30S';
  console.log(`[*] Visiting exact lottery route: ${wingoUrl}`);

  await page.goto(wingoUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(4000);

  // Dismiss any popup
  try {
    const confirmBtn = await page.$('button:has-text("Confirm"), .van-button--primary:has-text("Confirm")');
    if (confirmBtn) {
      await confirmBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
  } catch (e) {}

  console.log('[*] Final URL reached:', page.url());

  const html = await page.content();
  fs.writeFileSync('./captured_pages/03_wingo_exact.html', html, 'utf-8');
  await page.screenshot({ path: './captured_pages/03_wingo_exact.png', fullPage: true });

  console.log('[✓] Successfully captured 03_wingo_exact.html and .png!');
  await browser.close();
}

captureWinGoGame().catch(console.error);
