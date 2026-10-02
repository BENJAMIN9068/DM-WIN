import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PNG_DIR = path.join(__dirname, 'archived_site', 'assets', 'png');

// Find all referenced PNGs in CSS files
const cssDir = path.join(__dirname, 'archived_site', 'assets', 'css');
const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
const missingImages = new Set();
for (const file of cssFiles) {
  const content = fs.readFileSync(path.join(cssDir, file), 'utf-8');
  const matches = content.matchAll(/\/assets\/png\/([a-zA-Z0-9_\-\.]+)/g);
  for (const m of matches) {
    const assetName = m[1];
    const assetPath = path.join(PNG_DIR, assetName);
    if (!fs.existsSync(assetPath)) {
      missingImages.add(assetName);
    }
  }
}

console.log(`Found ${missingImages.size} missing PNG assets referenced in CSS.`);

// Helper to generate WinGo Ball SVG
function getWinGoBallSvg(num) {
  const isRed = [2, 4, 6, 8].includes(num);
  const isGreen = [1, 3, 7, 9].includes(num);
  const isZero = num === 0;
  const isFive = num === 5;

  let bgDef = '';
  let fill = '';

  if (isZero) {
    // Half red, half purple
    bgDef = `
      <linearGradient id="splitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="50%" stop-color="#fc5050"/>
        <stop offset="50.1%" stop-color="#9831e9"/>
      </linearGradient>
    `;
    fill = 'url(#splitGrad)';
  } else if (isFive) {
    // Half green, half purple
    bgDef = `
      <linearGradient id="splitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="50%" stop-color="#40ad72"/>
        <stop offset="50.1%" stop-color="#9831e9"/>
      </linearGradient>
    `;
    fill = 'url(#splitGrad)';
  } else if (isGreen) {
    bgDef = `
      <linearGradient id="greenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#4fd68d"/>
        <stop offset="100%" stop-color="#2d8f58"/>
      </linearGradient>
    `;
    fill = 'url(#greenGrad)';
  } else {
    bgDef = `
      <linearGradient id="redGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ff6b6b"/>
        <stop offset="100%" stop-color="#d63030"/>
      </linearGradient>
    `;
    fill = 'url(#redGrad)';
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
      <defs>
        ${bgDef}
        <radialGradient id="sphereLight" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
          <stop offset="35%" stop-color="#ffffff" stop-opacity="0.1"/>
          <stop offset="80%" stop-color="#000000" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
        </radialGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.25"/>
        </filter>
      </defs>
      <circle cx="70" cy="70" r="62" fill="${fill}" filter="url(#shadow)"/>
      <circle cx="70" cy="70" r="62" fill="url(#sphereLight)"/>
      <circle cx="70" cy="70" r="58" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-opacity="0.4"/>
      <text x="70" y="93" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-size="68" font-weight="900" fill="#ffffff" text-anchor="middle" filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.35))">${num}</text>
    </svg>
  `;
}

// Helper to generate K3 Dice SVG
function getDiceSvg(val) {
  const pips = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]]
  };

  const pipCoords = pips[val] || pips[1];
  const pipsSvg = pipCoords.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${val === 1 ? 14 : 9}" fill="${val === 1 ? '#e53935' : '#ffffff'}" />`).join('\n');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs>
        <linearGradient id="diceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ff5252"/>
          <stop offset="100%" stop-color="#c62828"/>
        </linearGradient>
        <filter id="diceShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="18" fill="url(#diceGrad)" filter="url(#diceShadow)"/>
      <rect x="8" y="8" width="84" height="84" rx="16" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.3"/>
      ${pipsSvg}
    </svg>
  `;
}

// Helper to generate TRX Hex SVG
function getHexCharSvg(char) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
      <defs>
        <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2a2e4a"/>
          <stop offset="100%" stop-color="#181a2b"/>
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#hexGrad)" stroke="#3a86ff" stroke-width="2.5"/>
      <text x="40" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-size="34" font-weight="900" fill="#f8b460" text-anchor="middle">${char}</text>
    </svg>
  `;
}

// Helper for WinGo Issue background
function getWinGoIssueSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 200" width="700" height="200">
      <defs>
        <linearGradient id="issueBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#20223b"/>
          <stop offset="100%" stop-color="#151627"/>
        </linearGradient>
        <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff4757" stop-opacity="0"/>
          <stop offset="50%" stop-color="#ff4757" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#ff4757" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="700" height="200" rx="16" fill="url(#issueBg)"/>
      <rect x="1" y="1" width="698" height="198" rx="15" fill="none" stroke="#2e3258" stroke-width="1.5"/>
      <path d="M 0 190 Q 350 150 700 190" fill="none" stroke="url(#accentLine)" stroke-width="3"/>
    </svg>
  `;
}

// Helper for Checkbox Agreement
function getAgreeSvg(checked) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
      ${checked ? `
        <circle cx="24" cy="24" r="20" fill="#40ad72"/>
        <polyline points="14,24 21,31 34,18" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      ` : `
        <circle cx="24" cy="24" r="20" fill="none" stroke="#777777" stroke-width="3"/>
      `}
    </svg>
  `;
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  async function renderSvgToPng(svgString, targetFilename, width = 140, height = 140) {
    const targetPath = path.join(PNG_DIR, targetFilename);
    await page.setViewportSize({ width, height });
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:${width}px;height:${height}px;">
          ${svgString}
        </body>
      </html>
    `;
    await page.setContent(html);
    const buffer = await page.screenshot({ omitBackground: true });
    fs.writeFileSync(targetPath, buffer);
    console.log(`[+] Generated: ${targetFilename} (${buffer.length} bytes)`);
  }

  // 1. Generate WinGo Number Balls (0 - 9)
  const wingoBallMap = {
    0: ['ball_0-Ca74Ns3T.png', 'n0-BMsYMETk.png', 'n0-CZn09L9_.png', '0-BG6QPOmD.png'],
    1: ['ball_1-DFUEzKvm.png', 'n1-DQoihf6M.png', 'n1-BwGtHT5h.png'],
    2: ['ball_2-BA1HkQbr.png', 'n2-BdRIuobe.png', 'n2-Cu_RIg4W.png', 'n2-BQEJsjCG.png'],
    3: ['ball_3-CSGWgLyY.png', 'n3-Di3ENqeN.png', 'n3-meiTgeYx.png', 'n3-CL6BSoCp.png'],
    4: ['ball_4-CU90k0Z5.png', 'n4-BgoHzGp7.png', 'n4-CKhZln44.png', 'n4-Bcu83fVD.png'],
    5: ['ball_5-DD5VBkEF.png', 'n5-CevcLrZ3.png', 'n5-DRtuCoBO.png', 'n5-DcVy1j2M.png'],
    6: ['ball_6-CRRe003w.png', 'n6-CuOXEhZU.png', 'n6-DfBPUfaO.png', 'n6-Bn7RijZz.png'],
    7: ['ball_7-Cf2z_aqK.png', 'n7-EerjFCzD.png', 'n7-Bj0d85rZ.png', 'n7-DEr_Nr5_.png'],
    8: ['ball_8-BWd7rcUJ.png', 'n8-CcLSOOHO.png', 'n8-CycLBQmW.png'],
    9: ['ball_9-DDw5YEZU.png', 'n9-BcSpChSK.png', 'n9-BWcCmBZJ.png']
  };

  for (let num = 0; num <= 9; num++) {
    const svg = getWinGoBallSvg(num);
    for (const filename of wingoBallMap[num]) {
      await renderSvgToPng(svg, filename, 140, 140);
    }
  }

  // 2. Generate K3 Dice (1 - 6)
  const diceMap = {
    1: ['num1-Dvmdd51j.png'],
    2: ['num2-Bjiwouja.png'],
    3: ['num3-DqB7fR7E.png'],
    4: ['num4-y7OTelTf.png'],
    5: ['num5-DwdV2vel.png'],
    6: ['num6-Dn342HJq.png']
  };

  for (let val = 1; val <= 6; val++) {
    const svg = getDiceSvg(val);
    for (const filename of (diceMap[val] || [])) {
      await renderSvgToPng(svg, filename, 100, 100);
    }
  }

  // 3. Generate TRX Hex characters (0-9, A-F)
  const hexChars = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
  for (const char of hexChars) {
    const svg = getHexCharSvg(char);
    const filesToGenerate = Array.from(missingImages).filter(f => f.startsWith(`num${char}-`));
    for (const filename of filesToGenerate) {
      await renderSvgToPng(svg, filename, 80, 80);
    }
  }

  // 4. Backgrounds & UI elements
  await renderSvgToPng(getWinGoIssueSvg(), 'wingoissue-CkOVY8Dv.png', 700, 200);
  await renderSvgToPng(getWinGoIssueSvg(), 'trxbg-CYE66u_p.png', 700, 200);
  await renderSvgToPng(getAgreeSvg(false), 'agree-b-CqpjWe8Y.png', 48, 48);
  await renderSvgToPng(getAgreeSvg(true), 'agree-a-5yM-ajXh.png', 48, 48);
  await renderSvgToPng(getWinGoBallSvg(2), 'redBall-C4CD7-Eb.png', 80, 80);
  await renderSvgToPng(getWinGoBallSvg(1), 'greenBall-CThfOlcF.png', 80, 80);

  // Close browser
  await browser.close();
  console.log('[✓] Asset generation complete!');
}

run().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
