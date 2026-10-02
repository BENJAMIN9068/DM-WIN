import { chromium } from 'playwright';

async function testBet() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  
  await page.goto('http://localhost:3000/#/home/AllLotteryGames/WinGo?typeId=1', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(2000);

  const greenBtn = await page.$('.Betting__C-head-g');
  console.log('Found green button:', !!greenBtn);
  if (greenBtn) {
    await greenBtn.click();
    await page.waitForTimeout(1000);
    const popupVisible = await page.$('.van-popup--bottom');
    console.log('Betting popup opened:', !!popupVisible);
    if (popupVisible) {
      const text = await popupVisible.innerText();
      console.log('Popup content preview:', text.replace(/\n+/g, ' '));
      await page.screenshot({ path: 'archived_site/betting_popup.png' });
    }
  }

  await browser.close();
}

testBet();
