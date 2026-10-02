import fs from 'fs';

let serveCode = fs.readFileSync('serve.mjs', 'utf8');

// Replace the API handlers section with comprehensive handlers
const targetStart = '    // WinGo & Lottery Issues';
const targetEnd = '    // Default universal success mock for all other APIs';

const startIdx = serveCode.indexOf(targetStart);
const endIdx = serveCode.indexOf(targetEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newSection = `    // PWA Domain list
    if (endpoint.includes('GetPwaDomainList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: []
      }));
      return;
    }

    // Site Messages
    if (endpoint.includes('GetSiteMessageList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: [],
          totalPage: 0,
          pageNo: 1
        }
      }));
      return;
    }

    // WinGo & Lottery Issues
    if (endpoint.includes('GetGameIssue') || endpoint.includes('WinGoGetGameIssue') || endpoint.includes('GetTRXGameIssue') || endpoint.includes('GetGameK3Issue') || endpoint.includes('GetGame5DIssue')) {
      const typeId = parseInt(body.typeId || 1);
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      
      let intervalSec = 60;
      if ([2, 10, 6, 14].includes(typeId)) intervalSec = 180;
      else if ([3, 11, 7, 15].includes(typeId)) intervalSec = 300;
      else if ([4, 12, 8, 16].includes(typeId)) intervalSec = 600;
      else if (typeId === 30) intervalSec = 30;

      const issueSeq = Math.floor(totalSeconds / intervalSec) + 1;
      const issueNumber = \`\${dateStr}\${String(issueSeq).padStart(4, '0')}\`;
      const passSeconds = totalSeconds % intervalSec;
      const remainingSec = intervalSec - passSeconds;

      const startTime = new Date(now.getTime() - passSeconds * 1000).toISOString().replace('T', ' ').slice(0, 19);
      const serviceTime = now.toISOString().replace('T', ' ').slice(0, 19);
      const endTime = new Date(now.getTime() + remainingSec * 1000).toISOString().replace('T', ' ').slice(0, 19);

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          issueNumber,
          preIssue: \`\${dateStr}\${String(Math.max(1, issueSeq - 1)).padStart(4, '0')}\`,
          startTime,
          serviceTime,
          endTime,
          remainingTime: remainingSec,
          seconds: remainingSec,
          lotteryTime: intervalSec,
          preResult: "7"
        }
      }));
      return;
    }

    // Lottery Type List (WinGo, TRX, K3, 5D)
    if (endpoint.includes('GetTypeList') || endpoint.includes('WinGoGetTypeList') || endpoint.includes('GetTRXtypeList') || endpoint.includes('GetK3TypeList') || endpoint.includes('Get5DtypeList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { typeID: 1, typeId: 1, typeName: "Win Go<br />1Min", tabName: "WinGo 1Min", intervalM: 1, scope: "1|10|100|1000", sort: 1, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "WinGo_1M", lottery: "WinGo" },
          { typeID: 2, typeId: 2, typeName: "Win Go<br />3Min", tabName: "WinGo 3Min", intervalM: 3, scope: "1|10|100|1000", sort: 2, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "WinGo_3M", lottery: "WinGo" },
          { typeID: 3, typeId: 3, typeName: "Win Go<br />5Min", tabName: "WinGo 5Min", intervalM: 5, scope: "1|10|100|1000", sort: 3, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "WinGo_5M", lottery: "WinGo" },
          { typeID: 4, typeId: 4, typeName: "Win Go<br />10Min", tabName: "WinGo 10Min", intervalM: 10, scope: "1|10|100|1000", sort: 4, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "WinGo_10M", lottery: "WinGo" },
          { typeID: 30, typeId: 30, typeName: "Win Go<br />30s", tabName: "WinGo 30s", intervalM: 0.5, scope: "1|10|100|1000", sort: 5, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "WinGo_30S", lottery: "WinGo" }
        ]
      }));
      return;
    }

    // Rules
    if (endpoint.includes('GetRule') || endpoint.includes('RuleByTypeId') || endpoint.includes('GetWinGoRule')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          gamePresentation: "1. Select Green, Red, or Purple to place a bet.\\n2. Total countdown timer resets every round.\\n3. Instant win calculations based on the winning ball outcome."
        }
      }));
      return;
    }

    // Long Dragon
    if (endpoint.includes('GetLongDragon') || endpoint.includes('LongDragon')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: []
      }));
      return;
    }

    // Lottery History Results
    if (endpoint.includes('GetEmerdList') || endpoint.includes('GetNoaverageEmerdList') || endpoint.includes('GetHistoryIssuePage') || endpoint.includes('GetMyEmerdList')) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const seq = Math.floor(totalSeconds / 60) + 1;
      
      const history = [];
      const sampleResults = [
        { num: 7, color: 'green', bs: 'b' },
        { num: 2, color: 'red', bs: 's' },
        { num: 0, color: 'red,violet', bs: 's' },
        { num: 5, color: 'green,violet', bs: 'b' },
        { num: 9, color: 'green', bs: 'b' },
        { num: 4, color: 'red', bs: 's' },
        { num: 8, color: 'red', bs: 'b' },
        { num: 1, color: 'green', bs: 's' },
        { num: 6, color: 'red', bs: 'b' },
        { num: 3, color: 'green', bs: 's' }
      ];

      for (let i = 1; i <= 10; i++) {
        const item = sampleResults[(seq - i + 20) % sampleResults.length];
        history.push({
          issueNumber: \`\${dateStr}\${String(Math.max(1, seq - i)).padStart(4, '0')}\`,
          number: item.num,
          colour: item.color,
          premium: item.num,
          block: String(item.num),
          bs: item.bs,
          amount: 10,
          state: 1
        });
      }

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: history,
          totalPage: 5,
          pageNo: 1
        },
        list: history,
        totalPage: 5,
        pageNo: 1
      }));
      return;
    }

    // Last Five Results
    if (endpoint.includes('GetLastFiveIssueNumberResult')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          number: "7,2,0,5,9",
          list: [7, 2, 0, 5, 9]
        }
      }));
      return;
    }

    // Game Betting (Placing Bets)
    if (endpoint.includes('GameBetting') || endpoint.includes('Betting')) {
      const user = users[currentActiveNumber] || Object.values(users)[0];
      const betAmt = Number(body.amount || 10) * Number(body.betCount || 1);
      if (user && user.amount >= betAmt) {
        user.amount -= betAmt;
        saveUsers();
      }
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "Bet placed successfully!",
        msgCode: 0,
        data: {
          orderNumber: "ORD" + Date.now(),
          amount: betAmt,
          balance: user?.amount || 1000
        }
      }));
      return;
    }

    // Recharge Channels
    if (endpoint.includes('GetRechargeTypes') || endpoint.includes('GetLocalRechargeTypes')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { typeId: 1, typeName: "UPI-QR", minAmount: 100, maxAmount: 50000, bonusRate: 5 },
          { typeId: 2, typeName: "Paytm Fast", minAmount: 200, maxAmount: 50000, bonusRate: 3 },
          { typeId: 3, typeName: "USDT-TRC20", minAmount: 1000, maxAmount: 1000000, bonusRate: 8 }
        ]
      }));
      return;
    }

    // Game Category List
    if (endpoint.includes('GetGameCategoryList')) {
      const list = [
        { categoryCode: "lottery", categoryName: "Lottery", sort: 1, state: 1 },
        { categoryCode: "slot", categoryName: "Slots", sort: 2, state: 1 },
        { categoryCode: "sports", categoryName: "Sports", sort: 3, state: 1 },
        { categoryCode: "casino", categoryName: "Casino", sort: 4, state: 1 },
        { categoryCode: "rummy", categoryName: "Rummy", sort: 5, state: 1 },
        { categoryCode: "fishing", categoryName: "Fishing", sort: 6, state: 1 },
        { categoryCode: "original", categoryName: "Original", sort: 7, state: 1 }
      ];
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: list,
        gameTypeList: list
      }));
      return;
    }
`;

  serveCode = serveCode.substring(0, startIdx) + newSection + serveCode.substring(endIdx);
  console.log('[+] Successfully updated serve.mjs API handlers');
} else {
  console.error('[-] Could not locate start and end index in serve.mjs');
}

// Add service worker bypass if not present
if (!serveCode.includes("reqPath === '/ar-sw.js'")) {
  const swHook = `  if (reqPath === '/ar-sw.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end('// sw disabled');
    return;
  }
`;
  serveCode = serveCode.replace('const server = http.createServer(async (req, res) => {', 'const server = http.createServer(async (req, res) => {\n' + swHook);
  console.log('[+] Added /ar-sw.js handler to serve.mjs');
}

fs.writeFileSync('serve.mjs', serveCode, 'utf8');
console.log('Saved updated serve.mjs!');
