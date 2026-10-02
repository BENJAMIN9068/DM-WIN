import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Target base URL
const BASE_URL = process.env.BASE_URL || 'https://www.shreewin39.com/#/';
const MOBILE = process.env.ARCHIVE_MOBILE_NUMBER || '';
const PASSWORD = process.env.ARCHIVE_PASSWORD || '';

const OUTPUT_DIR = path.resolve('./captured_pages');
const SESSION_FILE = path.resolve('./auth_session.json');

// Routes to crawl for game links
const TARGET_ROUTES = [
  'home/AllGames?type=flash',
  'home/AllGames?type=fish',
  'home/AllGames?type=slot',
  'home/AllGames?type=chess',
  'home/GameDetail',
];

async function authenticate(browser) {
  console.log('[*] Step 1: Performing authentication...');
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  const loginUrl = BASE_URL.replace('/#/', '') + '/#/login';
  console.log('[*] Navigating to login:', loginUrl);
  await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take screenshot to see login form
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'login_page.png'), fullPage: true });
  console.log('[*] Login page screenshot saved');

  // Try to fill mobile number
  try {
    const inputs = await page.$$('input');
    console.log(`[*] Found ${inputs.length} input fields`);
    
    if (inputs.length >= 2) {
      await inputs[0].fill(MOBILE);
      await inputs[1].fill(PASSWORD);
      console.log('[*] Filled credentials');
      
      // Find and click submit button
      const buttons = await page.$$('button');
      console.log(`[*] Found ${buttons.length} buttons`);
      for (const btn of buttons) {
        const text = await btn.innerText().catch(() => '');
        console.log('[*] Button text:', text);
        if (text.toLowerCase().includes('login') || text.toLowerCase().includes('sign') || text.toLowerCase().includes('log in')) {
          await btn.click();
          console.log('[*] Clicked login button');
          break;
        }
      }
      
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'after_login.png'), fullPage: true });
    }
  } catch (err) {
    console.log('[!] Login attempt error:', err.message);
  }

  await context.storageState({ path: SESSION_FILE });
  console.log('[+] Session state saved');
  await context.close();
}

async function scrapeGames(browser) {
  console.log('[*] Step 2: Scraping game pages...');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const contextOptions = fs.existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {};
  const context = await browser.newContext({
    ...contextOptions,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  const allExternalLinks = [];
  const allGameData = [];

  // Intercept network requests to capture game API calls
  const capturedApis = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('game') || url.includes('Game')) {
      try {
        const ct = response.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const body = await response.json().catch(() => null);
          if (body) {
            capturedApis.push({ url, body });
            console.log('[API]', url.substring(0, 100));
          }
        }
      } catch (_) {}
    }
  });

  const baseNoHash = BASE_URL.replace('/#/', '');

  for (const route of TARGET_ROUTES) {
    const fullUrl = `${baseNoHash}/#/${route}`;
    console.log(`\n[*] Visiting: ${fullUrl}`);

    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      const cleanName = route.replace(/[/#?=&]/g, '_');
      await page.screenshot({ path: path.join(OUTPUT_DIR, `${cleanName}.png`), fullPage: true });

      // Collect all anchor tags and their hrefs
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors.map(a => ({ href: a.href, text: a.innerText.trim(), id: a.id }));
      });

      const external = links.filter(l => 
        l.href && !l.href.includes(window?.location?.hostname) && 
        (l.href.startsWith('http') || l.href.includes('game'))
      );

      // Collect all game items visible on the page
      const gameItems = await page.evaluate(() => {
        const items = [];
        
        // Try various selectors for game cards
        const selectors = [
          '.game-item', '.game-card', '.game-box', '.item',
          '[class*="game"]', '[class*="Game"]',
          '.van-grid-item', '.grid-item'
        ];
        
        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          if (els.length > 0) {
            for (const el of els) {
              const img = el.querySelector('img');
              const link = el.querySelector('a') || el.closest('a');
              const nameEl = el.querySelector('[class*="name"], [class*="title"], span, p');
              items.push({
                selector: sel,
                text: el.innerText?.trim()?.substring(0, 100),
                imgSrc: img?.src,
                href: link?.href,
                name: nameEl?.innerText?.trim()
              });
            }
            break;
          }
        }
        return items;
      });

      console.log(`[+] Found ${links.length} links, ${external.length} external, ${gameItems.length} game items`);
      
      allExternalLinks.push(...external);
      allGameData.push({ route, gameItems, externalLinks: external });

      // Save page HTML
      const html = await page.content();
      fs.writeFileSync(path.join(OUTPUT_DIR, `${cleanName}.html`), html, 'utf-8');

    } catch (err) {
      console.error(`[x] Failed ${fullUrl}:`, err.message);
    }
  }

  // Now specifically look for game detail pages by clicking on games
  console.log('\n[*] Step 3: Clicking on individual games to find external URLs...');
  
  const homeUrl = `${baseNoHash}/#/home/AllGames?type=flash`;
  await page.goto(homeUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Get all clickable game elements
  const gameClickTargets = await page.evaluate(() => {
    const targets = [];
    const allEls = document.querySelectorAll('[class*="game"], [class*="Game"], .van-grid-item, .item');
    for (let i = 0; i < Math.min(allEls.length, 30); i++) {
      const el = allEls[i];
      const img = el.querySelector('img');
      const nameEl = el.querySelector('[class*="name"], span, p');
      targets.push({
        index: i,
        imgSrc: img?.src,
        name: nameEl?.innerText?.trim(),
        classes: el.className
      });
    }
    return targets;
  });

  console.log(`[*] Found ${gameClickTargets.length} potential game elements`);

  const externalGameUrls = [];

  for (let i = 0; i < Math.min(gameClickTargets.length, 20); i++) {
    try {
      await page.goto(homeUrl, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(2000);

      const els = await page.$$('[class*="game"], [class*="Game"], .van-grid-item, .item');
      if (i >= els.length) continue;

      const el = els[i];
      const name = await el.$eval('[class*="name"], span, p', e => e.innerText).catch(() => `game_${i}`);
      const imgSrc = await el.$eval('img', e => e.src).catch(() => '');

      // Listen for new pages/popups
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
        el.click().catch(() => {})
      ]);

      if (newPage) {
        const newUrl = newPage.url();
        console.log(`[POPUP] Game "${name}" opened: ${newUrl}`);
        externalGameUrls.push({ name, imgSrc, url: newUrl, type: 'popup' });
        await newPage.close();
      } else {
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        if (currentUrl !== homeUrl && currentUrl.includes('http')) {
          console.log(`[NAV] Game "${name}" navigated to: ${currentUrl}`);
          externalGameUrls.push({ name, imgSrc, url: currentUrl, type: 'navigation' });
        }
        
        // Check for iframes
        const iframes = await page.$$('iframe');
        for (const iframe of iframes) {
          const src = await iframe.getAttribute('src').catch(() => '');
          if (src) {
            console.log(`[IFRAME] Game "${name}" iframe: ${src}`);
            externalGameUrls.push({ name, imgSrc, url: src, type: 'iframe' });
          }
        }
      }
    } catch (err) {
      console.log(`[!] Error on game ${i}:`, err.message);
    }
  }

  // Save all captured data
  const result = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    externalGameUrls,
    allGameData,
    capturedApis: capturedApis.slice(0, 50)
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'external_game_links.json'), JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n[+] Results saved to ${OUTPUT_DIR}/external_game_links.json`);
  console.log(`[+] Found ${externalGameUrls.length} external game URLs`);

  await context.close();
}

async function main() {
  console.log('[*] Starting external game link capture...');
  console.log('[*] Base URL:', BASE_URL);
  console.log('[*] Mobile:', MOBILE);

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    if (MOBILE && PASSWORD) {
      await authenticate(browser);
    }
    await scrapeGames(browser);
    console.log('\n[+] Done!');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
