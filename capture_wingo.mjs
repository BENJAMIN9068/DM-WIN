import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function captureWinGo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: './auth_session.json',
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  console.log('[*] Navigating to home...');
  await page.goto('https://dmfirst1.com/#/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(3000);

  // Remove any blocking overlays completely via DOM
  await page.evaluate(() => {
    document.querySelectorAll('.dialog-queue-host, .van-overlay, .dialog-queue-host__overlay').forEach(el => el.remove());
  });
  await page.waitForTimeout(1000);

  // Click WinGo or Lottery section
  console.log('[*] Clicking Lottery category / WinGo...');
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => e.textContent && e.textContent.trim() === 'WinGo');
    if (el) {
      el.click();
    } else {
      window.location.hash = '#/saasLottery/WinGo?gameCode=WinGo_30S&lottery=WinGo';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });

  await page.waitForTimeout(6000);

  // Remove any modal that appears inside WinGo
  await page.evaluate(() => {
    document.querySelectorAll('.dialog-queue-host, .van-overlay').forEach(el => el.remove());
  });

  console.log('[*] Final URL:', page.url());

  const html = await page.content();
  fs.writeFileSync('./captured_pages/03_wingo_30s_live.html', html, 'utf-8');
  await page.screenshot({ path: './captured_pages/03_wingo_30s_live.png', fullPage: true });

  console.log('[✓] Successfully captured 03_wingo_30s_live!');
  await browser.close();
}

captureWinGo().catch(console.error);
